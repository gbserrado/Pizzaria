export type PizzaSize = 'Pequena' | 'Média' | 'Grande' | 'Família';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  category: 'Tradicional' | 'Especial' | 'Doce' | 'Premium' | 'Bebidas';
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

export interface Order {
  id?: string;
  userId: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'preparing' | 'delivering' | 'completed' | 'cancelled';
  deliveryType: 'delivery' | 'pickup';
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

export const PIZZAS: Pizza[] = [
  {
    id: '1',
    name: 'Calabresa',
    description: 'Molho de tomate, muçarela, calabresa fatiada e cebola.',
    basePrice: 40,
    category: 'Tradicional',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format&fit=crop',
    popular: true,
    available: true
  },
  {
    id: '3',
    name: 'Portuguesa',
    description: 'Molho de tomate, muçarela, presunto, ovos, cebola e azeitonas.',
    basePrice: 45,
    category: 'Tradicional',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=800&auto=format&fit=crop',
    available: true
  },
  {
    id: '4',
    name: 'Quatro Queijos',
    description: 'Muçarela, provolone, parmesão e gorgonzola.',
    basePrice: 48,
    category: 'Especial',
    image: 'https://images.unsplash.com/photo-1548369937-47519962c11a?q=80&w=800&auto=format&fit=crop',
    available: true
  },
  {
    id: '5',
    name: 'Frango com Catupiry',
    description: 'Frango desfiado, muçarela e o legítimo Catupiry.',
    basePrice: 46,
    category: 'Especial',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format&fit=crop',
    popular: true,
    available: true
  },
  {
    id: '6',
    name: 'Ouro Preto',
    description: 'Carne seca desfiada, muçarela, cebola roxa e pimenta biquinho.',
    basePrice: 55,
    category: 'Premium',
    image: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?q=80&w=800&auto=format&fit=crop',
    popular: true,
    available: true
  },
  {
    id: '7',
    name: 'Chocolate com Morango',
    description: 'Chocolate ao leite, morangos frescos e leite condensado.',
    basePrice: 44,
    category: 'Doce',
    image: 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?q=80&w=800&auto=format&fit=crop',
    available: true
  },
  {
    id: '8',
    name: 'Romeu e Julieta',
    description: 'Muçarela e goiabada cremosa.',
    basePrice: 40,
    category: 'Doce',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format&fit=crop',
    available: true
  },
  {
    id: 'b1',
    name: 'Coca-Cola 2L',
    description: 'Refrigerante Coca-Cola garrafa 2 litros.',
    basePrice: 12,
    category: 'Bebidas',
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=800&auto=format&fit=crop',
    available: true
  },
  {
    id: 'b2',
    name: 'Guaraná Antarctica 2L',
    description: 'Refrigerante Guaraná Antarctica garrafa 2 litros.',
    basePrice: 10,
    category: 'Bebidas',
    image: 'https://images.unsplash.com/photo-1527960471264-93ad939988c0?q=80&w=800&auto=format&fit=crop',
    available: true
  },
  {
    id: 'b3',
    name: 'Fanta Laranja 2L',
    description: 'Refrigerante Fanta Laranja garrafa 2 litros.',
    basePrice: 10,
    category: 'Bebidas',
    image: 'https://images.unsplash.com/photo-1624517452488-04869289c4ca?q=80&w=800&auto=format&fit=crop',
    available: true
  },
  {
    id: 'b4',
    name: 'Guaravita 290ml',
    description: 'Copo de Guaravita 290ml.',
    basePrice: 4,
    category: 'Bebidas',
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=800&auto=format&fit=crop',
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

export const SIZES: { label: PizzaSize; multiplier: number }[] = [
  { label: 'Pequena', multiplier: 0.8 },
  { label: 'Média', multiplier: 1.0 },
  { label: 'Grande', multiplier: 1.2 },
  { label: 'Família', multiplier: 1.5 }
];

export const EXTRA_INGREDIENTS = [
  { name: 'Borda Recheada', price: 10 },
  { name: 'Extra Queijo', price: 5 },
  { name: 'Bacon', price: 6 },
  { name: 'Azeitonas', price: 3 }
];
