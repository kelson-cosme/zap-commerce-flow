// src/components/AdminPanel.tsx

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
  Plus,
  ArrowLeft,
  Loader2, // Ícone de carregamento
  CreditCard
} from "lucide-react";
import { useWhatsApp } from "@/hooks/useWhatsApp";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Interfaces para os tipos de dados
interface Order {
  id: string;
  customerName: string;
  customerPhoneNumber: string;
  items: Array<{ product_retailer_id: string, quantity: string; item_price: string }>;
  total: number;
  status: string;
  createdAt: string;
}

interface AdminPanelProps {
    orderId?: string | null;
    onBackToChat: () => void;
}

export function AdminPanel({ orderId, onBackToChat }: AdminPanelProps) {
  // Chamada única ao hook para obter todas as funções e o estado de loading
  const { addProductToCatalog, sendPaymentLink, loading: isWhatsAppLoading } = useWhatsApp();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState(orderId ? 'orders' : 'products');
  const [orders, setOrders] = useState<Order[]>([]);
  const [detailedOrder, setDetailedOrder] = useState<Order | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);

  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: 0,
    image_url: '',
    retailer_id: ''
  });

  // Efeito para buscar a lista de todos os pedidos
  useEffect(() => {
    const fetchOrders = async () => {
        const { data, error } = await supabase
            .from('whatsapp_orders')
            .select(`*, conversation:whatsapp_conversations(contact:whatsapp_contacts(name, phone_number))`)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Erro ao buscar pedidos:", error);
            return;
        }
        
        const formattedOrders: Order[] = data?.map((o: any) => ({
            id: o.id,
            customerName: o.conversation?.contact?.name || o.conversation?.contact?.phone_number || 'Desconhecido',
            customerPhoneNumber: o.conversation?.contact?.phone_number,
            items: o.products,
            total: o.products.reduce((acc: number, item: any) => acc + (parseFloat(item.item_price) * parseInt(item.quantity, 10)), 0),
            status: o.status,
            createdAt: o.created_at,
        })) || [];
        
        setOrders(formattedOrders);
    };
    fetchOrders();
  }, []);

  // Efeito para buscar um pedido específico quando orderId é passado
  useEffect(() => {
    const fetchSpecificOrder = async () => {
        if (orderId) {
            setIsLoadingOrder(true);
            setDetailedOrder(null);
            const { data, error } = await supabase
                .from('whatsapp_orders')
                .select(`*, conversation:whatsapp_conversations(contact:whatsapp_contacts(name, phone_number))`)
                .eq('id', orderId)
                .single();

            if (data && !error) {
                const formattedOrder: Order = {
                    id: data.id,
                    customerName: data.conversation?.contact?.name || data.conversation?.contact?.phone_number || 'Desconhecido',
                    customerPhoneNumber: data.conversation?.contact?.phone_number,
                    items: data.products,
                    total: data.products.reduce((acc: number, item: any) => acc + (parseFloat(item.item_price) * parseInt(item.quantity, 10)), 0),
                    status: data.status,
                    createdAt: data.created_at,
                };
                setDetailedOrder(formattedOrder);
            } else {
                console.error("Erro ao buscar detalhe do pedido:", error);
            }
            setIsLoadingOrder(false);
        }
    };

    fetchSpecificOrder();
  }, [orderId]);

  useEffect(() => {
    if (orderId) {
      setActiveTab('orders');
    }
  }, [orderId]);
  
  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.description || newProduct.price <= 0 || !newProduct.image_url || !newProduct.retailer_id) {
        toast({
          title: "Erro de Validação",
          description: "Por favor, preencha todos os campos do produto, incluindo o SKU.",
          variant: "destructive",
        });
        return;
      }
      try {
        await addProductToCatalog(newProduct);
        toast({
          title: "Produto Adicionado!",
          description: "O produto foi adicionado ao catálogo da Meta com sucesso.",
        });
        setNewProduct({ name: '', description: '', price: 0, image_url: '', retailer_id: '' });
      } catch (error) {
        toast({
          title: "Erro ao adicionar produto",
          description: (error as Error).message,
          variant: "destructive",
        });
      }
  };
  
const handleSendPayment = async (order: Order) => {
    // Validação para garantir que temos os dados necessários
    if (!order || !order.customerPhoneNumber || !order.customerName) {
        toast({ 
            title: "Erro de Dados", 
            description: "Não foi possível encontrar os detalhes do cliente para gerar o pagamento.", 
            variant: "destructive" 
        });
        return;
    };

    // Detalhes para a cobrança no Asaas
    const paymentDetails = {
        amount: order.total,
        description: `Pagamento referente ao Pedido #${order.id.substring(0, 8)}`,
    };

    // Detalhes do cliente para o Asaas.
    // NOTA: O CPF/CNPJ é obrigatório pelo Asaas.
    // Aqui, estamos a usar um valor de exemplo. Numa aplicação real,
    // você precisaria de ter este dado guardado no seu banco de dados.
    const customerDetails = {
        name: order.customerName,
        cpfCnpj: "01188242105" // <<<<<<< IMPORTANTE: Substitua por um CPF/CNPJ real ou guardado do cliente
    };

    try {
        // Chama a função do hook para iniciar todo o processo
        await sendPaymentLink(order.customerPhoneNumber, paymentDetails, customerDetails);
        
        toast({ 
            title: "Sucesso!", 
            description: "Link de pagamento enviado para o cliente." 
        });

    } catch (error) {
        console.error("Erro ao enviar link de pagamento:", error);
        toast({ 
            title: "Erro", 
            description: "Não foi possível enviar o link de pagamento. Verifique o console para mais detalhes.", 
            variant: "destructive" 
        });
    }
};

  return (
    <div>
        <div className="border-b p-4 bg-whatsapp-green text-white flex items-center justify-between">
            <h1 className="text-xl font-semibold">Painel Administrativo</h1>
            <Button variant="ghost" onClick={onBackToChat} className="text-white hover:bg-whatsapp-green-dark">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Voltar ao Chat
            </Button>
        </div>
        <div className="p-6 space-y-6">
            {/* Cards de estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card><CardContent className="p-6"><div className="flex items-center space-x-2"><Package className="h-8 w-8 text-primary" /><div><p className="text-sm font-medium text-muted-foreground">Produtos</p><p className="text-2xl font-bold"> {/*products.length*/} </p></div></div></CardContent></Card>
                <Card><CardContent className="p-6"><div className="flex items-center space-x-2"><ShoppingCart className="h-8 w-8 text-primary" /><div><p className="text-sm font-medium text-muted-foreground">Pedidos</p><p className="text-2xl font-bold">{orders.length}</p></div></div></CardContent></Card>
                <Card><CardContent className="p-6"><div className="flex items-center space-x-2"><TrendingUp className="h-8 w-8 text-success" /><div><p className="text-sm font-medium text-muted-foreground">Vendas Hoje</p><p className="text-2xl font-bold">R$ 6.398,97</p></div></div></CardContent></Card>
                <Card><CardContent className="p-6"><div className="flex items-center space-x-2"><Users className="h-8 w-8 text-primary" /><div><p className="text-sm font-medium text-muted-foreground">Clientes Ativos</p><p className="text-2xl font-bold">12</p></div></div></CardContent></Card>
            </div>


            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="orders">Pedidos</TabsTrigger>
                    <TabsTrigger value="products">Produtos</TabsTrigger>
                </TabsList>

                <TabsContent value="orders" className="space-y-4">
                    {orderId ? (
                        isLoadingOrder ? (
                            <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-4">A carregar detalhes do pedido...</p></div>
                        ) : detailedOrder ? (
                            <Card>
                                <CardHeader><CardTitle>Detalhes do Pedido #{detailedOrder.id.substring(0, 8)}</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="mb-2"><strong>Cliente:</strong> {detailedOrder.customerName}</div>
                                    <div className="mb-2"><strong>Status:</strong> <Badge>{detailedOrder.status}</Badge></div>
                                    <div className="mb-4"><strong>Total:</strong> <span className="font-bold text-lg">R$ {detailedOrder.total.toFixed(2)}</span></div>
                                    <hr className="my-4"/>
                                    <h4 className="font-semibold mb-2">Itens:</h4>
                                    <ul className="list-disc pl-5 space-y-1 mb-6">
                                        {detailedOrder.items.map((item, index) => (
                                            <li key={index}>{item.quantity}x {item.product_retailer_id}</li>
                                        ))}
                                    </ul>
                                    <Button onClick={() => handleSendPayment(detailedOrder)} disabled={isWhatsAppLoading} className="w-full">
                                        <CreditCard className="h-4 w-4 mr-2" />
                                        {isWhatsAppLoading ? 'A Enviar...' : 'Gerar e Enviar Link de Pagamento'}
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : (
                            <p className="text-muted-foreground mt-4">Pedido não encontrado.</p>
                        )
                    ) : (
                        <div>
                           <h3 className="text-lg font-medium">Todos os Pedidos</h3>
                           {orders.length > 0 ? (
                               <div className="space-y-4 mt-4">
                                   {orders.map(order => (
                                       <Card key={order.id}>
                                           <CardContent className="p-4 flex justify-between items-center">
                                               <div>
                                                   <p className="font-semibold">Pedido #{order.id.substring(0, 8)}</p>
                                                   <p className="text-sm text-muted-foreground">{order.customerName}</p>
                                               </div>
                                               <div className="text-right">
                                                   <p className="font-bold">R$ {order.total.toFixed(2)}</p>
                                                   <Badge>{order.status}</Badge>
                                               </div>
                                           </CardContent>
                                       </Card>
                                   ))}
                               </div>
                           ) : (
                               <p className="text-muted-foreground mt-4">Nenhum pedido encontrado.</p>
                           )}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="products" className="space-y-4">
                  <Card>
                    <CardHeader><CardTitle>Adicionar Novo Produto ao Catálogo da Meta</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label htmlFor="product-name">Nome do Produto</Label><Input id="product-name" placeholder="Ex: Smartphone Galaxy S24" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} /></div>
                        <div className="space-y-2"><Label htmlFor="product-retailer-id">SKU / ID do Varejista</Label><Input id="product-retailer-id" placeholder="Ex: PROD-001" value={newProduct.retailer_id} onChange={(e) => setNewProduct({ ...newProduct, retailer_id: e.target.value })} /></div>
                      </div>
                      <div className="space-y-2"><Label htmlFor="product-price">Preço (R$)</Label><Input id="product-price" type="number" placeholder="Ex: 2999.99" value={newProduct.price || ''} onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || 0 })} /></div>
                      <div className="space-y-2"><Label htmlFor="product-description">Descrição</Label><Input id="product-description" placeholder="Ex: O mais novo smartphone com câmera de 200MP" value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} /></div>
                      <div className="space-y-2"><Label htmlFor="product-image">URL da Imagem</Label><Input id="product-image" placeholder="https://exemplo.com/imagem.png" value={newProduct.image_url} onChange={(e) => setNewProduct({ ...newProduct, image_url: e.target.value })} /></div>
                      <Button onClick={handleAddProduct} disabled={isWhatsAppLoading}>
                        <Plus className="h-4 w-4 mr-2" />
                        {isWhatsAppLoading ? 'Adicionando...' : 'Adicionar ao Catálogo da Meta'}
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
            </Tabs>
        </div>
    </div>
  );
}