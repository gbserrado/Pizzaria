export type PizzaSize = 'Broto' | 'Pequena' | 'Média' | 'Grande' | 'Maracanã';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  category: 'Tradicional' | 'Especial' | 'Doce' | 'Premium' | 'Bebidas' | 'Sanduíches';
  image: string;
  popular?: boolean;
  available?: boolean;
}

export type Pizza = MenuItem;

export interface CartItem {
  id: string;
  pizza: Pizza;
  pizza2?: Pizza; // For half-and-half
  size?: PizzaSize;
  extras: string[];
  quantity: number;
  totalPrice: number;
}

export type OrderStatus = 'received' | 'cooking' | 'delivery' | 'completed' | 'cancelled';

export type PaymentMethod = 'cash_delivery' | 'card_delivery' | 'pix_now';

export interface Order {
  id?: string;
  userId: string;
  customerName: string;
  phone: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  deliveryType: 'delivery' | 'pickup';
  paymentMethod: string;
  deliveryFee: number;
  address: {
    street: string;
    number: string;
    neighborhood: string;
    complement: string;
  };
  createdAt: any;
  couponCode?: string;
  discount?: number;
}

export interface StoreConfig {
  lojaAberta: boolean;
}

export interface LoyaltyProfile {
  phone: string;
  points: number;
}

export const PIZZAS: Pizza[] = [
  {
    id: '1',
    name: 'Mussarela',
    description: 'Mussarela, orégano',
    basePrice: 26,
    category: 'Tradicional',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format&fit=crop',
    popular: true,
    available: true
  },
  {
    id: '2',
    name: 'Alho',
    description: 'Alho, mussarela, orégano',
    basePrice: 28,
    category: 'Tradicional',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format&fit=crop',
    available: true
  },
  {
    id: '3',
    name: 'Marguerita',
    description: 'Mussarela, tomate, manjericão, orégano',
    basePrice: 28,
    category: 'Tradicional',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=800&auto=format&fit=crop',
    available: true
  },
  {
    id: '4',
    name: 'Mista',
    description: 'Presunto, mussarela, orégano',
    basePrice: 28,
    category: 'Tradicional',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format&fit=crop',
    available: true
  },
  {
    id: '5',
    name: 'Bacon',
    description: 'Bacon, mussarela, orégano',
    basePrice: 32,
    category: 'Especial',
    image: 'https://images.unsplash.com/photo-1548369937-47519962c11a?q=80&w=800&auto=format&fit=crop',
    popular: true,
    available: true
  },
  {
    id: '6',
    name: 'Calabresa',
    description: 'Calabresa, cebola, orégano',
    basePrice: 32,
    category: 'Especial',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format&fit=crop',
    popular: true,
    available: true
  },
  {
    id: '7',
    name: 'Champignon',
    description: 'Champignon, mussarela, orégano',
    basePrice: 32,
    category: 'Especial',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format&fit=crop',
    available: true
  },
  {
    id: '8',
    name: 'Frango',
    description: 'Frango desfiado, mussarela, orégano',
    basePrice: 32,
    category: 'Especial',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format&fit=crop',
    available: true
  },
  {
    id: '9',
    name: 'Marguerita c/ Calabresa',
    description: 'Mussarela, tomate, manjericão, calabresa, orégano',
    basePrice: 32,
    category: 'Especial',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format&fit=crop',
    available: true
  },
  {
    id: '10',
    name: 'Quatro Queijos',
    description: 'Mussarela, provolone, parmesão, gorgonzola, orégano',
    basePrice: 32,
    category: 'Especial',
    image: 'https://images.unsplash.com/photo-1548369937-47519962c11a?q=80&w=800&auto=format&fit=crop',
    available: true
  },
  {
    id: '11',
    name: 'Atum',
    description: 'Atum, cebola, orégano',
    basePrice: 34,
    category: 'Premium',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format&fit=crop',
    available: true
  },
  {
    id: '12',
    name: 'Calabresa c/ Catupiry',
    description: 'Calabresa, catupiry, cebola, orégano',
    basePrice: 34,
    category: 'Premium',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format&fit=crop',
    available: true
  },
  {
    id: '13',
    name: 'Carne Seca',
    description: 'Carne seca, mussarela, cebola, orégano',
    basePrice: 34,
    category: 'Premium',
    image: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?q=80&w=800&auto=format&fit=crop',
    popular: true,
    available: true
  },
  {
    id: '14',
    name: 'Da Casa',
    description: 'Mussarela, presunto, calabresa, bacon, ovo, cebola, pimentão, azeitona, orégano',
    basePrice: 34,
    category: 'Premium',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format&fit=crop',
    available: true
  },
  {
    id: '15',
    name: 'Especial',
    description: 'Mussarela, lombo, champignon, palmito, bacon, cebola, orégano',
    basePrice: 34,
    category: 'Premium',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format&fit=crop',
    available: true
  },
  {
    id: '16',
    name: 'Lombo Canadense',
    description: 'Lombo canadense, mussarela, cebola, orégano',
    basePrice: 34,
    category: 'Premium',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format&fit=crop',
    available: true
  },
  {
    id: '17',
    name: 'Palmito',
    description: 'Palmito, mussarela, orégano',
    basePrice: 34,
    category: 'Premium',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format&fit=crop',
    available: true
  },
  {
    id: '18',
    name: 'Portuguesa',
    description: 'Mussarela, presunto, ovo, cebola, ervilha, azeitona, orégano',
    basePrice: 34,
    category: 'Premium',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=800&auto=format&fit=crop',
    popular: true,
    available: true
  },
  {
    id: '19',
    name: 'Real',
    description: 'Mussarela, presunto, calabresa, bacon, milho, ervilha, orégano',
    basePrice: 34,
    category: 'Premium',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format&fit=crop',
    available: true
  },
  {
    id: '20',
    name: 'Camarão com Catupiry',
    description: 'Camarão, catupiry, orégano',
    basePrice: 34,
    category: 'Premium',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format&fit=crop',
    available: true
  },
  {
    id: 'd1',
    name: 'Banana c/ Chocolate',
    description: 'mussarela, chocolate, banana, açucar e canela',
    basePrice: 30,
    category: 'Doce',
    image: 'https://images.unsplash.com/photo-1590947132387-155cc02f3212?q=80&w=800&auto=format&fit=crop',
    available: true
  },
  {
    id: 'd2',
    name: 'Banana',
    description: 'mussarela, banana, açucar e canela',
    basePrice: 26,
    category: 'Doce',
    image: 'https://images.unsplash.com/photo-1590947132387-155cc02f3212?q=80&w=800&auto=format&fit=crop',
    available: true
  },
  {
    id: 'd3',
    name: 'Chocolate',
    description: 'mussarela, chocolate e granulado',
    basePrice: 26,
    category: 'Doce',
    image: 'https://images.unsplash.com/photo-1590947132387-155cc02f3212?q=80&w=800&auto=format&fit=crop',
    available: true
  },
  {
    id: 's1',
    name: 'X-Tudo',
    description: 'Hambúrguer, queijo, presunto, bacon, ovo, alface, tomate, milho, batata palha.',
    basePrice: 25,
    category: 'Sanduíches',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=800&auto=format&fit=crop',
    available: true
  },
  {
    id: 's2',
    name: 'X-Bacon',
    description: 'Hambúrguer, queijo, bacon, alface, tomate.',
    basePrice: 22,
    category: 'Sanduíches',
    image: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?q=80&w=800&auto=format&fit=crop',
    available: true
  },
  {
    id: 's3',
    name: 'X-Burguer',
    description: 'Hambúrguer, queijo, alface, tomate.',
    basePrice: 18,
    category: 'Sanduíches',
    image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?q=80&w=800&auto=format&fit=crop',
    available: true
  },
  {
    id: 'b1',
    name: 'H2O Limão Pet 500ml',
    description: 'Unidade 500ml',
    basePrice: 10,
    category: 'Bebidas',
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=800&auto=format&fit=crop',
    available: true
  },
  {
    id: 'b2',
    name: 'Guaraná Antárctica 2 L',
    description: 'Garrafa 2l',
    basePrice: 15,
    category: 'Bebidas',
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=800&auto=format&fit=crop',
    available: true
  },
  {
    id: 'b3',
    name: 'Coca-Cola 1,5l',
    description: 'Garrafa 1,5l',
    basePrice: 14,
    category: 'Bebidas',
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=800&auto=format&fit=crop',
    available: true
  },
  {
    id: 'b4',
    name: 'h2o limoneto 500 ml',
    description: 'Unidade 500ml',
    basePrice: 10,
    category: 'Bebidas',
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=800&auto=format&fit=crop',
    available: true
  },
  {
    id: 'b5',
    name: 'H2O Limoneto 1.5lt',
    description: 'Unidade 1,5l',
    basePrice: 14,
    category: 'Bebidas',
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=800&auto=format&fit=crop',
    available: true
  },
  {
    id: 'b6',
    name: 'Guaravita Natural 290ml',
    description: 'Unidade 290ml',
    basePrice: 3.5,
    category: 'Bebidas',
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=800&auto=format&fit=crop',
    available: true
  },
  {
    id: 'b7',
    name: 'Ginseng Guaraviton 500ml',
    description: 'Embalagem 500ml',
    basePrice: 9,
    category: 'Bebidas',
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=800&auto=format&fit=crop',
    available: true
  },
  {
    id: 'b8',
    name: 'Coca-Cola Original 350ml',
    description: 'Lata 350ml',
    basePrice: 8,
    category: 'Bebidas',
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=800&auto=format&fit=crop',
    available: true
  },
  {
    id: 'b9',
    name: 'Coca-Cola Original 2l',
    description: 'Garrafa 2l',
    basePrice: 16,
    category: 'Bebidas',
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=800&auto=format&fit=crop',
    available: true
  },
  {
    id: 'b10',
    name: 'coca zero 2 litros',
    description: 'Garrafa 2l',
    basePrice: 16,
    category: 'Bebidas',
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=800&auto=format&fit=crop',
    available: true
  },
  {
    id: 'b11',
    name: 'coca cola 600 ml',
    description: 'coca cola de 600 ml',
    basePrice: 11,
    category: 'Bebidas',
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=800&auto=format&fit=crop',
    available: true
  },
  {
    id: 'b12',
    name: 'coca 1,5 zero',
    description: 'Garrafa 1,5l',
    basePrice: 14,
    category: 'Bebidas',
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=800&auto=format&fit=crop',
    available: true
  },
  {
    id: 'b13',
    name: 'Água sem Gás',
    description: 'Garrafa 500ml',
    basePrice: 3,
    category: 'Bebidas',
    image: 'https://images.unsplash.com/photo-1548919973-5dea585532ad?q=80&w=800&auto=format&fit=crop',
    available: true
  },
  {
    id: 'b14',
    name: 'Água com Gás',
    description: 'Garrafa 500ml',
    basePrice: 4,
    category: 'Bebidas',
    image: 'https://images.unsplash.com/photo-1548919973-5dea585532ad?q=80&w=800&auto=format&fit=crop',
    available: true
  }
];

export const DELIVERY_FEES: { name: string; fee: number }[] = [
  { name: 'Conselheiro Paulino', fee: 5.00 },
  { name: 'Chácara Paraíso', fee: 7.00 },
  { name: 'Centro', fee: 10.00 },
  { name: 'Olaria', fee: 12.00 },
  { name: 'Prado', fee: 6.00 },
  { name: 'Jardim Ouro Preto', fee: 6.00 },
  { name: 'Riograndina', fee: 8.00 },
  { name: 'Duas Pedras', fee: 8.00 },
  { name: 'Cônego', fee: 12.00 },
  { name: 'Cascatinha', fee: 15.00 },
  { name: 'Braunes', fee: 10.00 },
  { name: 'Paissandu', fee: 10.00 },
  { name: 'Mury', fee: 20.00 },
  { name: 'Lumiar', fee: 35.00 },
  { name: 'São Pedro da Serra', fee: 35.00 },
  { name: 'Amparo', fee: 25.00 },
  { name: 'Campo do Coelho', fee: 15.00 },
  { name: 'Conquista', fee: 20.00 },
  { name: 'Vargem Alta', fee: 25.00 },
  { name: 'Stucky', fee: 20.00 },
  { name: 'Debossan', fee: 20.00 },
  { name: 'Ponte da Saudade', fee: 15.00 },
  { name: 'Ypu', fee: 10.00 },
  { name: 'Vila Amélia', fee: 10.00 },
  { name: 'Vila Nova', fee: 10.00 },
  { name: 'Suspiro', fee: 10.00 },
  { name: 'Bela Vista', fee: 12.00 },
  { name: 'Cordoeira', fee: 12.00 },
  { name: 'Granja Spinelli', fee: 15.00 }
].sort((a, b) => a.name.localeCompare(b.name));

export const NEIGHBORHOODS = DELIVERY_FEES.map(f => f.name);

export const SIZES: { label: PizzaSize; multiplier: number; maxFlavors: number; slices: number }[] = [
  { label: 'Broto', multiplier: 26 / 26, maxFlavors: 1, slices: 3 },
  { label: 'Pequena', multiplier: 37.5 / 26, maxFlavors: 2, slices: 5 },
  { label: 'Média', multiplier: 60 / 26, maxFlavors: 2, slices: 8 },
  { label: 'Grande', multiplier: 75 / 26, maxFlavors: 2, slices: 10 },
  { label: 'Maracanã', multiplier: 90 / 26, maxFlavors: 2, slices: 14 }
];

export const EXTRA_INGREDIENTS = [
  { name: 'Borda Recheada', price: 10 },
  { name: 'Extra Queijo', price: 5 },
  { name: 'Bacon', price: 6 },
  { name: 'Azeitonas', price: 3 }
];
