import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Order, OrderStatus } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Truck, CheckCircle2, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const DELIVERY_PASSWORD = 'motoboy123';

export default function DeliveryDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const q = query(collection(db, 'orders'), where('status', '==', 'delivery'));
    const unsub = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    });
    return () => unsub();
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === DELIVERY_PASSWORD) setIsAuthenticated(true);
    else toast.error('Senha incorreta!');
  };

  const markAsDelivered = async (orderId: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: 'completed' });
      toast.success('Pedido entregue!');
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  if (!isAuthenticated) return (
    <div className="min-h-screen bg-deep-black flex items-center justify-center p-4">
      <Card className="w-full max-w-sm bg-graphite border-white/10 text-white">
        <CardHeader><CardTitle>Acesso Motoboy</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <Label>Senha</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button type="submit" className="w-full bg-gold text-deep-black">Entrar</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-deep-black p-4 text-white">
      <h1 className="text-2xl font-black uppercase mb-6 text-gold">Pedidos para Entrega</h1>
      <div className="space-y-4">
        {orders.map(order => (
          <Card key={order.id} className="bg-white/5 border-white/10 text-white p-4 flex justify-between items-center">
            <div>
              <p className="font-black text-lg">#{order.id?.slice(-6).toUpperCase()}</p>
              <p className="text-sm text-white/60">{order.customerName}</p>
              <p className="text-xs text-white/40">{order.address?.street}, {order.address?.number}</p>
            </div>
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => markAsDelivered(order.id!)}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Entregue
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
