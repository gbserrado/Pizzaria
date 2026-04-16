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
  Wallet
} from 'lucide-react';
import { db } from '../firebase';
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
import { 
  signInWithPopup, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { auth } from '../firebase';
import { Order, OrderStatus, PIZZAS, Pizza, StoreConfig } from '../types';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const ADMIN_PASSWORD = 'admin'; // Simple password as requested

  const OrderCard: React.FC<{ order: Order, onUpdateStatus: (id: string, status: OrderStatus, phone?: string) => void | Promise<void> }> = ({ order, onUpdateStatus }) => {
    const [isPanic, setIsPanic] = useState(false);

    useEffect(() => {
      if (order.status !== 'received' || !order.createdAt) {
        setIsPanic(false);
        return;
      }

      const checkPanic = () => {
        const orderTime = order.createdAt?.toDate().getTime() || 0;
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
          <Badge variant="outline" className="bg-gold/10 text-gold border-gold/20 uppercase text-[10px] font-black">
            {order.paymentMethod === 'pix_now' ? 'PIX' : order.paymentMethod === 'card_delivery' ? 'CARTÃO' : 'DINHEIRO'}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-white/60 text-xs">
            <MapPin className="h-3 w-3" />
            <span>{order.address.neighborhood}, {order.address.street} {order.address.number}</span>
          </div>
          <div className="flex items-center gap-2 text-white/60 text-xs">
            <Phone className="h-3 w-3" />
            <span>{order.phone}</span>
          </div>
        </div>

        <div className="bg-black/20 rounded-xl p-3 space-y-2">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex justify-between text-xs">
              <span className="font-bold text-white/80">{item.quantity}x {item.pizza.name} {item.size && `(${item.size})`}</span>
              <span className="text-gold font-black">R$ {item.totalPrice.toFixed(2)}</span>
            </div>
          ))}
          <div className="pt-2 border-t border-white/5 flex justify-between items-center">
            <span className="text-[10px] font-black uppercase text-white/40">Total</span>
            <span className="text-lg font-black text-gold">R$ {order.total.toFixed(2)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="border-white/10 hover:bg-white/10 text-white text-[10px] font-black uppercase"
            onClick={() => {
              const msg = `Olá ${order.customerName}, aqui é da Pizzaria Ouro Preto! Recebemos seu pedido #${order.id?.slice(-6)} pelo site, mas ainda não confirmamos o pagamento. Como você prefere pagar para seguirmos com o preparo?`;
              window.open(`https://wa.me/55${order.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
            }}
          >
            <MessageCircle className="h-3 w-3 mr-2 text-green-500" />
            WhatsApp
          </Button>
          
          {order.status === 'received' && (
            <Button 
              size="sm"
              className={cn("text-[10px] font-black uppercase", isPanic ? "bg-red-600 hover:bg-red-700 text-white" : "bg-gold hover:bg-gold-dark text-deep-black")}
              onClick={() => onUpdateStatus(order.id!, 'cooking')}
            >
              Produzir
            </Button>
          )}
          
          {order.status === 'cooking' && (
            <Button 
              size="sm"
              className="bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-black uppercase"
              onClick={() => onUpdateStatus(order.id!, 'delivery')}
            >
              Entregar
            </Button>
          )}

          {order.status === 'delivery' && (
            <Button 
              size="sm"
              className="bg-green-500 hover:bg-green-600 text-white text-[10px] font-black uppercase"
              onClick={() => onUpdateStatus(order.id!, 'completed', order.phone)}
            >
              Concluir
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [storeConfig, setStoreConfig] = useState<StoreConfig>({ lojaAberta: true });
  const [menuStatus, setMenuStatus] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'orders' | 'kitchen' | 'menu' | 'settings'>('orders');
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Listen to orders
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribeOrders = onSnapshot(q, (snapshot) => {
      const newOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      
      // Check for new 'received' orders to play sound
      const hasNewReceived = newOrders.some(order => 
        order.status === 'received' && 
        !orders.find(o => o.id === order.id)
      );

      if (hasNewReceived && audioRef.current) {
        audioRef.current.play().catch(e => console.log('Audio play failed:', e));
      }

      setOrders(newOrders);
    }, (error) => {
      console.error('Admin Orders Error:', error);
      toast.error('Erro ao carregar pedidos. Verifique suas permissões.');
    });

    // Listen to store config
    const unsubscribeConfig = onSnapshot(doc(db, 'config', 'store'), (snapshot: any) => {
      if (snapshot.exists()) {
        setStoreConfig(snapshot.data() as StoreConfig);
      } else {
        // Initialize if not exists
        setDoc(snapshot.ref, { lojaAberta: true });
      }
    }, (error) => {
      console.error('Admin Config Error:', error);
    });

    // Listen to menu status
    const unsubscribeMenu = onSnapshot(collection(db, 'menu'), (snapshot) => {
      const status: Record<string, boolean> = {};
      snapshot.docs.forEach(doc => {
        status[doc.id] = doc.data().available;
      });
      setMenuStatus(status);
    }, (error) => {
      console.error('Admin Menu Error:', error);
    });

    return () => {
      unsubscribeOrders();
      unsubscribeConfig();
      unsubscribeMenu();
    };
  }, [isAuthenticated, orders]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      toast.success('Senha correta! Verificando permissões do Google...');
    } else {
      toast.error('Senha incorreta!');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      if (auth.currentUser?.email === 'Gabriel06nf@gmail.com') {
        setIsAuthenticated(true);
        toast.success('Acesso concedido!');
      } else {
        toast.error('Este e-mail não tem permissão de administrador.');
      }
    } catch (error) {
      toast.error('Erro ao fazer login com Google');
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
                  className="bg-white/5 border-white/10 text-white h-12"
                  placeholder="Digite a senha..."
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full bg-gold hover:bg-gold-dark text-deep-black font-black h-12 uppercase tracking-widest">
                Entrar no Sistema
              </Button>
              
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-graphite px-2 text-white/40">Ou use o Google</span>
                </div>
              </div>

              <Button 
                type="button"
                variant="outline"
                onClick={handleGoogleLogin}
                className="w-full border-white/10 hover:bg-white/5 text-white h-12 font-bold"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 mr-2" alt="Google" />
                Login com Google (Admin)
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

        <button 
          onClick={() => setIsAuthenticated(false)}
          className="mt-auto p-3 rounded-xl text-white/40 hover:text-red-500 hover:bg-red-500/10 transition-all"
        >
          <LogOut className="h-6 w-6" />
        </button>
      </div>

      {/* Main Content */}
      <main className="pl-20 min-h-screen">
        <header className="h-20 border-b border-white/10 bg-graphite/50 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-black uppercase italic tracking-tighter">
              {activeTab === 'orders' ? 'Gestão de Pedidos' : activeTab === 'kitchen' ? 'Visão da Cozinha' : activeTab === 'menu' ? 'Cardápio' : 'Configurações'}
            </h1>
            <Badge variant="outline" className={cn("uppercase text-[10px] font-black", storeConfig.lojaAberta ? "text-green-500 border-green-500/20 bg-green-500/10" : "text-red-500 border-red-500/20 bg-red-500/10")}>
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
                    {order.items.map((item, idx) => (
                      <div key={idx} className="space-y-2 border-b border-white/10 pb-4 last:border-0 last:pb-0">
                        <div className="flex items-start gap-4">
                          <span className="text-4xl font-black text-gold">{item.quantity}x</span>
                          <div>
                            <h3 className="text-2xl font-black uppercase leading-tight">
                              {item.pizza2 ? `1/2 ${item.pizza.name} + 1/2 ${item.pizza2.name}` : item.pizza.name}
                            </h3>
                            {item.size && <p className="text-xl text-white/60 font-bold uppercase mt-1">Tamanho: {item.size}</p>}
                          </div>
                        </div>
                        {item.extras.length > 0 && (
                          <div className="bg-red-500/20 border border-red-500/50 p-3 rounded-xl mt-4">
                            <p className="text-sm font-black text-red-400 uppercase mb-1">Adicionais:</p>
                            <ul className="list-disc list-inside text-lg font-bold text-white">
                              {item.extras.map((extra, i) => <li key={i}>{extra}</li>)}
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
                    ))}
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
                  <CardHeader className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-sm font-black uppercase italic">{pizza.name}</CardTitle>
                        <CardDescription className="text-[10px]">{pizza.category}</CardDescription>
                      </div>
                      <Badge variant="outline" className={cn("text-[10px] font-black", menuStatus[pizza.id] !== false ? "text-green-500" : "text-red-500")}>
                        {menuStatus[pizza.id] !== false ? 'DISPONÍVEL' : 'ESGOTADO'}
                      </Badge>
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
