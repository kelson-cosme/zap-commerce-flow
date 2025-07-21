// import { useState } from "react";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import {
//   Package,
//   ShoppingCart,
//   TrendingUp,
//   Users,
//   Plus,
//   Edit,
//   Eye,
//   CheckCircle,
//   Clock,
//   AlertCircle
// } from "lucide-react";

// interface Product {
//   id: string;
//   name: string;
//   price: number;
//   image: string;
//   description: string;
//   stock: number;
//   active: boolean;
// }

// interface Order {
//   id: string;
//   customerName: string;
//   items: Array<{ product: string; quantity: number; price: number }>;
//   total: number;
//   status: 'pending' | 'confirmed' | 'delivered' | 'cancelled';
//   createdAt: string;
// }

// export function AdminPanel() {
//   const [products] = useState<Product[]>([
//     {
//       id: '1',
//       name: 'Smartphone Galaxy S23',
//       price: 2499.99,
//       image: '/placeholder.svg',
//       description: 'Smartphone top de linha com câmera profissional',
//       stock: 15,
//       active: true
//     },
//     {
//       id: '2',
//       name: 'Notebook Dell Inspiron',
//       price: 3299.00,
//       image: '/placeholder.svg',
//       description: 'Notebook ideal para trabalho e estudos',
//       stock: 8,
//       active: true
//     },
//     {
//       id: '3',
//       name: 'Fone Bluetooth Premium',
//       price: 299.99,
//       image: '/placeholder.svg',
//       description: 'Fone sem fio com cancelamento de ruído',
//       stock: 25,
//       active: true
//     }
//   ]);

//   const [orders] = useState<Order[]>([
//     {
//       id: 'ORD-001',
//       customerName: 'João Silva',
//       items: [{ product: 'Smartphone Galaxy S23', quantity: 1, price: 2499.99 }],
//       total: 2499.99,
//       status: 'pending',
//       createdAt: '2024-01-15T10:30:00Z'
//     },
//     {
//       id: 'ORD-002',
//       customerName: 'Maria Santos',
//       items: [{ product: 'Fone Bluetooth Premium', quantity: 2, price: 299.99 }],
//       total: 599.98,
//       status: 'confirmed',
//       createdAt: '2024-01-15T09:15:00Z'
//     },
//     {
//       id: 'ORD-003',
//       customerName: 'Pedro Costa',
//       items: [{ product: 'Notebook Dell Inspiron', quantity: 1, price: 3299.00 }],
//       total: 3299.00,
//       status: 'delivered',
//       createdAt: '2024-01-14T16:45:00Z'
//     }
//   ]);

//   const getStatusIcon = (status: Order['status']) => {
//     switch (status) {
//       case 'pending':
//         return <Clock className="h-4 w-4" />;
//       case 'confirmed':
//         return <AlertCircle className="h-4 w-4" />;
//       case 'delivered':
//         return <CheckCircle className="h-4 w-4" />;
//       default:
//         return <AlertCircle className="h-4 w-4" />;
//     }
//   };

//   const getStatusColor = (status: Order['status']) => {
//     switch (status) {
//       case 'pending':
//         return 'bg-warning';
//       case 'confirmed':
//         return 'bg-primary';
//       case 'delivered':
//         return 'bg-success';
//       case 'cancelled':
//         return 'bg-destructive';
//       default:
//         return 'bg-muted';
//     }
//   };

//   const getStatusText = (status: Order['status']) => {
//     switch (status) {
//       case 'pending':
//         return 'Pendente';
//       case 'confirmed':
//         return 'Confirmado';
//       case 'delivered':
//         return 'Entregue';
//       case 'cancelled':
//         return 'Cancelado';
//       default:
//         return status;
//     }
//   };

//   return (
//     <div className="p-6 space-y-6">
//       {/* Dashboard Stats */}
//       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//         <Card>
//           <CardContent className="p-6">
//             <div className="flex items-center space-x-2">
//               <Package className="h-8 w-8 text-primary" />
//               <div>
//                 <p className="text-sm font-medium text-muted-foreground">Produtos</p>
//                 <p className="text-2xl font-bold">{products.length}</p>
//               </div>
//             </div>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardContent className="p-6">
//             <div className="flex items-center space-x-2">
//               <ShoppingCart className="h-8 w-8 text-primary" />
//               <div>
//                 <p className="text-sm font-medium text-muted-foreground">Pedidos</p>
//                 <p className="text-2xl font-bold">{orders.length}</p>
//               </div>
//             </div>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardContent className="p-6">
//             <div className="flex items-center space-x-2">
//               <TrendingUp className="h-8 w-8 text-success" />
//               <div>
//                 <p className="text-sm font-medium text-muted-foreground">Vendas Hoje</p>
//                 <p className="text-2xl font-bold">R$ 6.398,97</p>
//               </div>
//             </div>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardContent className="p-6">
//             <div className="flex items-center space-x-2">
//               <Users className="h-8 w-8 text-primary" />
//               <div>
//                 <p className="text-sm font-medium text-muted-foreground">Clientes Ativos</p>
//                 <p className="text-2xl font-bold">12</p>
//               </div>
//             </div>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Tabs */}
//       <Tabs defaultValue="orders" className="space-y-4">
//         <TabsList className="grid w-full grid-cols-2">
//           <TabsTrigger value="orders">Pedidos</TabsTrigger>
//           <TabsTrigger value="products">Produtos</TabsTrigger>
//         </TabsList>

//         <TabsContent value="orders" className="space-y-4">
//           <div className="flex justify-between items-center">
//             <h3 className="text-lg font-medium">Gerenciar Pedidos</h3>
//           </div>

//           <div className="space-y-4">
//             {orders.map((order) => (
//               <Card key={order.id}>
//                 <CardContent className="p-6">
//                   <div className="flex items-center justify-between">
//                     <div className="flex items-center space-x-4">
//                       <div>
//                         <p className="font-medium">{order.id}</p>
//                         <p className="text-sm text-muted-foreground">{order.customerName}</p>
//                       </div>
//                       <Badge className={`${getStatusColor(order.status)} text-white`}>
//                         <div className="flex items-center gap-1">
//                           {getStatusIcon(order.status)}
//                           {getStatusText(order.status)}
//                         </div>
//                       </Badge>
//                     </div>

//                     <div className="text-right">
//                       <p className="font-bold">R$ {order.total.toFixed(2)}</p>
//                       <p className="text-sm text-muted-foreground">
//                         {new Date(order.createdAt).toLocaleDateString('pt-BR')}
//                       </p>
//                     </div>
//                   </div>

//                   <div className="mt-4">
//                     <div className="text-sm space-y-1">
//                       {order.items.map((item, index) => (
//                         <div key={index} className="flex justify-between">
//                           <span>{item.quantity}x {item.product}</span>
//                           <span>R$ {(item.quantity * item.price).toFixed(2)}</span>
//                         </div>
//                       ))}
//                     </div>
//                   </div>

//                   <div className="mt-4 flex gap-2">
//                     <Button variant="outline" size="sm">
//                       <Eye className="h-4 w-4 mr-1" />
//                       Ver Detalhes
//                     </Button>
//                     {order.status === 'pending' && (
//                       <Button size="sm" className="bg-success hover:bg-success/90">
//                         <CheckCircle className="h-4 w-4 mr-1" />
//                         Confirmar
//                       </Button>
//                     )}
//                   </div>
//                 </CardContent>
//               </Card>
//             ))}
//           </div>
//         </TabsContent>

//         <TabsContent value="products" className="space-y-4">
//           <div className="flex justify-between items-center">
//             <h3 className="text-lg font-medium">Gerenciar Produtos</h3>
//             <Button>
//               <Plus className="h-4 w-4 mr-2" />
//               Novo Produto
//             </Button>
//           </div>

//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//             {products.map((product) => (
//               <Card key={product.id}>
//                 <CardContent className="p-4">
//                   <div className="aspect-square bg-muted rounded-lg mb-4">
//                     <img
//                       src={product.image}
//                       alt={product.name}
//                       className="w-full h-full object-cover rounded-lg"
//                     />
//                   </div>

//                   <h4 className="font-medium mb-2">{product.name}</h4>
//                   <p className="text-sm text-muted-foreground mb-2">{product.description}</p>

//                   <div className="flex items-center justify-between mb-3">
//                     <span className="font-bold text-lg">R$ {product.price.toFixed(2)}</span>
//                     <Badge variant={product.stock > 0 ? "default" : "destructive"}>
//                       Estoque: {product.stock}
//                     </Badge>
//                   </div>

//                   <div className="flex gap-2">
//                     <Button variant="outline" size="sm" className="flex-1">
//                       <Edit className="h-4 w-4 mr-1" />
//                       Editar
//                     </Button>
//                     <Button variant="outline" size="sm" className="flex-1">
//                       <Eye className="h-4 w-4 mr-1" />
//                       Ver
//                     </Button>
//                   </div>
//                 </CardContent>
//               </Card>
//             ))}
//           </div>
//         </TabsContent>
//       </Tabs>
//     </div>
//   );
// }

// src/components/AdminPanel.tsx

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
  Plus,
  Edit,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react";

// Importando o hook e a interface de 'useProducts'
import { useProducts, Product } from "@/hooks/useProducts";
// Importando o formulário que criamos
import { ProductForm } from "./ProductForm";

// A interface do Produto agora vem do nosso hook, mas a de Pedido mantemos aqui por enquanto
interface Order {
  id: string;
  customerName: string;
  items: Array<{ product: string; quantity: number; price: number }>;
  total: number;
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled';
  createdAt: string;
}

export function AdminPanel() {
  // Estado para os produtos, agora iniciando como um array vazio
  const [products, setProducts] = useState<Product[]>([]);
  // Estado para controlar a abertura do modal de formulário
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // Utilizando nosso hook para ter acesso às funções de busca e criação
  const { getProducts, createProduct, loading: productsLoading } = useProducts();

  // Mantendo os pedidos como dados estáticos por enquanto
  const [orders] = useState<Order[]>([
    {
      id: 'ORD-001',
      customerName: 'João Silva',
      items: [{ product: 'Smartphone Galaxy S23', quantity: 1, price: 2499.99 }],
      total: 2499.99,
      status: 'pending',
      createdAt: '2024-01-15T10:30:00Z'
    },
    {
      id: 'ORD-002',
      customerName: 'Maria Santos',
      items: [{ product: 'Fone Bluetooth Premium', quantity: 2, price: 299.99 }],
      total: 599.98,
      status: 'confirmed',
      createdAt: '2024-01-15T09:15:00Z'
    },
  ]);


  // Este useEffect busca os produtos do Supabase quando o componente é montado
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const productData = await getProducts();
        if (productData) {
          setProducts(productData as Product[]);
        }
      } catch (error) {
        console.error("Falha ao carregar produtos:", error);
      }
    };
    loadProducts();
  }, [getProducts]);
  
  // Função para lidar com a submissão do formulário de novo produto
  const handleCreateProduct = async (productData: Omit<Product, 'id'>) => {
    try {
      await createProduct(productData);
      // Após criar, busca a lista atualizada de produtos
      const updatedProducts = await getProducts();
      if (updatedProducts) {
        setProducts(updatedProducts as Product[]);
      }
      setIsFormOpen(false); // Fecha o modal
    } catch (error) {
      console.error("Falha ao criar produto:", error);
    }
  };


  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'confirmed': return <AlertCircle className="h-4 w-4" />;
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'bg-warning';
      case 'confirmed': return 'bg-primary';
      case 'delivered': return 'bg-success';
      case 'cancelled': return 'bg-destructive';
      default: return 'bg-muted';
    }
  };

  const getStatusText = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'confirmed': return 'Confirmado';
      case 'delivered': return 'Entregue';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Package className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Produtos</p>
                <p className="text-2xl font-bold">{products.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pedidos</p>
                <p className="text-2xl font-bold">{orders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-success" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vendas Hoje</p>
                <p className="text-2xl font-bold">R$ 3.199,97</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Clientes Ativos</p>
                <p className="text-2xl font-bold">12</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="products" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="orders">Pedidos</TabsTrigger>
          <TabsTrigger value="products">Produtos</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          {/* ... conteúdo da aba de pedidos ... */}
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Gerenciar Produtos</h3>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Produto
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Novo Produto</DialogTitle>
                </DialogHeader>
                <ProductForm
                  onSubmit={handleCreateProduct}
                  onCancel={() => setIsFormOpen(false)}
                  loading={productsLoading}
                />
              </DialogContent>
            </Dialog>
          </div>
          
          {productsLoading && <p>Carregando produtos...</p>}
          {!productsLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <Card key={product.id}>
                  <CardContent className="p-4">
                    <div className="aspect-square bg-muted rounded-lg mb-4">
                      <img 
                        src={product.image_url || '/placeholder.svg'} 
                        alt={product.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>
                    
                    <h4 className="font-medium mb-2">{product.name}</h4>
                    <p className="text-sm text-muted-foreground mb-2 h-10 overflow-hidden">{product.description}</p>
                    
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-lg">R$ {product.price.toFixed(2)}</span>
                      <Badge variant={product.stock > 0 ? "default" : "destructive"}>
                        Estoque: {product.stock}
                      </Badge>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}