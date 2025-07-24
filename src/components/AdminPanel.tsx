

// // src/components/AdminPanel.tsx

// import { useState, useEffect } from "react";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import {
//   Package,
//   ShoppingCart,
//   TrendingUp,
//   Users,
//   Plus,
//   ArrowLeft,
//   Loader2,
//   CreditCard,
//   Save
// } from "lucide-react";
// import { useWhatsApp } from "@/hooks/useWhatsApp";
// import { useToast } from "@/hooks/use-toast";
// import { supabase } from "@/integrations/supabase/client";

// // --- Interfaces ---
// interface Order {
//   id: string;
//   customerName: string;
//   customerPhoneNumber: string;
//   customerContactId: string;
//   customerCpfCnpj: string | null;
//   items: Array<{ product_retailer_id: string, quantity: string; item_price: string }>;
//   total: number;
//   status: string;
//   createdAt: string;
//   tracking_code: string | null;
// }

// interface AdminPanelProps {
//     orderId?: string | null;
//     onBackToChat: () => void;
// }

// export function AdminPanel({ orderId, onBackToChat }: AdminPanelProps) {
//   const { addProductToCatalog, sendPaymentLink, loading: isWhatsAppLoading } = useWhatsApp();
//   const { toast } = useToast();
  
//   const [activeTab, setActiveTab] = useState(orderId ? 'orders' : 'products');
//   const [orders, setOrders] = useState<Order[]>([]);
//   const [detailedOrder, setDetailedOrder] = useState<Order | null>(null);
//   const [isLoadingOrder, setIsLoadingOrder] = useState(false);
//   const [isSaving, setIsSaving] = useState(false);
  
//   const [customerCpf, setCustomerCpf] = useState("");
//   const [orderStatus, setOrderStatus] = useState("");
//   const [trackingCode, setTrackingCode] = useState("");

//   const [newProduct, setNewProduct] = useState({
//     name: '',
//     description: '',
//     price: 0,
//     image_url: '',
//     retailer_id: ''
//   });

//   // Efeito para buscar a lista de todos os pedidos
//   useEffect(() => {
//     const fetchOrders = async () => {
//         const { data, error } = await supabase
//             .from('whatsapp_orders')
//             .select(`*, conversation:whatsapp_conversations(contact:whatsapp_contacts(id, name, phone_number, cpf_cnpj))`)
//             .order('created_at', { ascending: false });

//         if (error) {
//             console.error("Erro ao buscar pedidos:", error); return;
//         }
        
//         const formattedOrders: Order[] = data?.map((o: any) => ({
//             id: o.id,
//             customerName: o.conversation?.contact?.name || 'Desconhecido',
//             customerPhoneNumber: o.conversation?.contact?.phone_number,
//             customerContactId: o.conversation?.contact?.id,
//             customerCpfCnpj: o.conversation?.contact?.cpf_cnpj,
//             items: o.products,
//             total: o.products.reduce((acc: number, item: any) => acc + (parseFloat(item.item_price) * parseInt(item.quantity, 10)), 0),
//             status: o.status,
//             createdAt: o.created_at,
//             tracking_code: o.tracking_code,
//         })) || [];
//         setOrders(formattedOrders);
//     };
//     fetchOrders();
//   }, []);

//   // Efeito para buscar um pedido específico
//   useEffect(() => {
//     const fetchSpecificOrder = async () => {
//         if (orderId) {
//             setIsLoadingOrder(true);
//             setDetailedOrder(null);
//             const { data, error } = await supabase
//                 .from('whatsapp_orders')
//                 .select(`*, conversation:whatsapp_conversations(contact:whatsapp_contacts(id, name, phone_number, cpf_cnpj))`)
//                 .eq('id', orderId)
//                 .single();

//             if (data && !error) {
//                 const formattedOrder: Order = {
//                     id: data.id,
//                     customerName: data.conversation?.contact?.name || 'Desconhecido',
//                     customerPhoneNumber: data.conversation?.contact?.phone_number,
//                     customerContactId: data.conversation?.contact?.id,
//                     customerCpfCnpj: data.conversation?.contact?.cpf_cnpj,
//                     items: data.products,
//                     total: data.products.reduce((acc: number, item: any) => acc + (parseFloat(item.item_price) * parseInt(item.quantity, 10)), 0),
//                     status: data.status,
//                     createdAt: data.created_at,
//                     tracking_code: data.tracking_code,
//                 };
//                 setDetailedOrder(formattedOrder);
//                 setCustomerCpf(formattedOrder.customerCpfCnpj || "");
//                 setOrderStatus(formattedOrder.status);
//                 setTrackingCode(formattedOrder.tracking_code || "");
//             }
//             setIsLoadingOrder(false);
//         }
//     };
//     fetchSpecificOrder();
//   }, [orderId]);

//   useEffect(() => {
//     if (orderId) setActiveTab('orders');
//   }, [orderId]);
  
//   const handleAddProduct = async () => { /* ... */ };

// const handleSendPayment = async (order: Order) => {
//     const finalCpf = order.customerCpfCnpj || customerCpf;
//     if (!finalCpf || finalCpf.length < 11) {
//         toast({ title: "Erro", description: "Por favor, insira um CPF/CNPJ válido.", variant: "destructive" }); return;
//     }

//     if (!order.customerCpfCnpj && finalCpf) {
//         await supabase.from('whatsapp_contacts').update({ cpf_cnpj: finalCpf }).eq('id', order.customerContactId);
//     }
    
//     const customerDetails = {
//         name: order.customerName,
//         cpfCnpj: finalCpf,
//         mobilePhone: order.customerPhoneNumber
//     };

//     const paymentDetails = {
//         amount: order.total,
//         description: `Pedido #${order.id.substring(0, 8)}`,
//     };

//     try {
//         // --- ALTERAÇÃO AQUI: Passamos o `order.id` como o último argumento ---
//         await sendPaymentLink(order.customerPhoneNumber, paymentDetails, customerDetails, order.id);
//         toast({ title: "Sucesso!", description: "Link de pagamento enviado para o cliente." });
//     } catch (error) {
//         toast({ title: "Erro", description: "Não foi possível enviar o link de pagamento.", variant: "destructive" });
//     }
//   };
  
//   const handleUpdateOrder = async () => {
//     if (!detailedOrder) return;
//     setIsSaving(true);
//     const { error } = await supabase
//         .from('whatsapp_orders')
//         .update({ status: orderStatus, tracking_code: trackingCode })
//         .eq('id', detailedOrder.id);
    
//     if (error) {
//         toast({ title: "Erro", description: "Não foi possível atualizar o pedido.", variant: "destructive" });
//     } else {
//         toast({ title: "Sucesso!", description: "Pedido atualizado." });
//     }
//     setIsSaving(false);
//   };

//   const getStatusVariant = (status: string) => {
//     switch (status) {
//       case 'pago':
//         return 'success';
//       case 'enviado':
//         return 'info';
//       case 'entregue':
//         return 'default';
//       case 'cancelado':
//         return 'destructive';
//       default:
//         return 'secondary';
//     }
//   };


//   return (
//     <div>
//         <div className="border-b p-4 bg-whatsapp-green text-white flex items-center justify-between">
//             <h1 className="text-xl font-semibold">Painel Administrativo</h1>
//             <Button variant="ghost" onClick={onBackToChat} className="text-white hover:bg-whatsapp-green-dark">
//               <ArrowLeft className="h-5 w-5 mr-2" />
//               Voltar ao Chat
//             </Button>
//         </div>
//         <div className="p-6 space-y-6">
//             {/* Cards de estatísticas */}
//             <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
//                 <TabsList className="grid w-full grid-cols-2">
//                     <TabsTrigger value="orders">Pedidos</TabsTrigger>
//                     <TabsTrigger value="products">Produtos</TabsTrigger>
//                 </TabsList>

//                 <TabsContent value="orders" className="space-y-4">
//                     {orderId ? (
//                         // --- VISTA DE DETALHE DO PEDIDO ---
//                         isLoadingOrder ? (
//                             <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-4">A carregar detalhes do pedido...</p></div>
//                         ) : detailedOrder ? (
//                             <Card>
//                                 <CardHeader><CardTitle>Detalhes do Pedido #{detailedOrder.id.substring(0, 8)}</CardTitle></CardHeader>
//                                 <CardContent className="space-y-6">
//                                     <div>
//                                         <p className="mb-2"><strong>Cliente:</strong> {detailedOrder.customerName}</p>
//                                         <p className="mb-4"><strong>Total:</strong> <span className="font-bold text-lg">R$ {detailedOrder.total.toFixed(2)}</span></p>
//                                     </div>
//                                     <hr/>
//                                     <div className="space-y-2">
//                                         <Label htmlFor="customer-cpf">CPF / CNPJ do Cliente</Label>
//                                         {detailedOrder.customerCpfCnpj ? (
//                                             <p className="text-sm font-medium p-2 bg-muted rounded-md">{detailedOrder.customerCpfCnpj}</p>
//                                         ) : (
//                                             <Input id="customer-cpf" placeholder="Insira o CPF ou CNPJ para o pagamento" value={customerCpf} onChange={(e) => setCustomerCpf(e.target.value)} />
//                                         )}
//                                     </div>
//                                     <Button onClick={() => handleSendPayment(detailedOrder)} disabled={isWhatsAppLoading || (!detailedOrder.customerCpfCnpj && customerCpf.length < 11)} className="w-full">
//                                         <CreditCard className="h-4 w-4 mr-2" />
//                                         {isWhatsAppLoading ? 'A Enviar...' : 'Gerar e Enviar Link de Pagamento'}
//                                     </Button>
//                                     <hr/>
//                                     <div>
//                                         <h4 className="font-semibold mb-4">Gerir Pedido</h4>
//                                         <div className="grid grid-cols-2 gap-4 mb-4">
//                                             <div className="space-y-2">
//                                                 <Label htmlFor="order-status">Status do Pedido</Label>
//                                                 <Select value={orderStatus} onValueChange={setOrderStatus}>
//                                                     <SelectTrigger id="order-status"><SelectValue /></SelectTrigger>
//                                                     <SelectContent>
//                                                         <SelectItem value="recebido">Recebido</SelectItem>
//                                                         <SelectItem value="pago">Pago</SelectItem>
//                                                         <SelectItem value="processando">Processando</SelectItem>
//                                                         <SelectItem value="enviado">Enviado</SelectItem>
//                                                         <SelectItem value="entregue">Entregue</SelectItem>
//                                                         <SelectItem value="cancelado">Cancelado</SelectItem>
//                                                     </SelectContent>
//                                                 </Select>
//                                             </div>
//                                             <div className="space-y-2">
//                                                 <Label htmlFor="tracking-code">Código de Rastreio</Label>
//                                                 <Input id="tracking-code" placeholder="Insira o código aqui" value={trackingCode} onChange={(e) => setTrackingCode(e.target.value)} disabled={orderStatus !== 'enviado'} />
//                                             </div>
//                                         </div>
//                                         <Button onClick={handleUpdateOrder} disabled={isSaving} className="w-full">
//                                             <Save className="h-4 w-4 mr-2" />
//                                             {isSaving ? 'A Guardar...' : 'Guardar Alterações'}
//                                         </Button>
//                                     </div>
//                                 </CardContent>
//                             </Card>
//                         ) : (
//                             <p className="text-muted-foreground mt-4">Pedido não encontrado.</p>
//                         )
//                     ) : (
//                         // --- VISTA DE LISTA DE TODOS OS PEDIDOS ---
//                         <Card>
//                            <CardHeader>
//                                <CardTitle>Todos os Pedidos</CardTitle>
//                            </CardHeader>
//                            <CardContent>
//                                {orders.length > 0 ? (
//                                    <div className="space-y-4">
//                                        {orders.map(order => (
//                                            <Card key={order.id} className="hover:bg-muted/50">
//                                                <CardContent className="p-4 grid grid-cols-4 items-center gap-4">
//                                                    <div>
//                                                        <p className="font-semibold text-sm">Pedido #{order.id.substring(0, 8)}</p>
//                                                        <p className="text-xs text-muted-foreground">{order.customerName}</p>
//                                                    </div>
//                                                    <div className="text-center">
//                                                         <Badge variant={getStatusVariant(order.status) as any}>{order.status}</Badge>
//                                                    </div>
//                                                    <div className="text-right">
//                                                        <p className="font-bold">R$ {order.total.toFixed(2)}</p>
//                                                    </div>
//                                                    <div className="text-right">
//                                                         <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</p>
//                                                    </div>
//                                                </CardContent>
//                                            </Card>
//                                        ))}
//                                    </div>
//                                ) : (
//                                    <p className="text-muted-foreground text-center p-4">Nenhum pedido encontrado.</p>
//                                )}
//                            </CardContent>
//                         </Card>
//                     )}
//                 </TabsContent>

//                      <TabsContent value="products" className="space-y-4">
//                        <Card>
//                          <CardHeader><CardTitle>Adicionar Novo Produto ao Catálogo da Meta</CardTitle></CardHeader>
//                          <CardContent className="space-y-4">
//                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                              <div className="space-y-2"><Label htmlFor="product-name">Nome do Produto</Label><Input id="product-name" placeholder="Ex: Smartphone Galaxy S24" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} /></div>
//                              <div className="space-y-2"><Label htmlFor="product-retailer-id">SKU / ID do Varejista</Label><Input id="product-retailer-id" placeholder="Ex: PROD-001" value={newProduct.retailer_id} onChange={(e) => setNewProduct({ ...newProduct, retailer_id: e.target.value })} /></div>
//                            </div>
//                            <div className="space-y-2"><Label htmlFor="product-price">Preço (R$)</Label><Input id="product-price" type="number" placeholder="Ex: 2999.99" value={newProduct.price || ''} onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || 0 })} /></div>
//                            <div className="space-y-2"><Label htmlFor="product-description">Descrição</Label><Input id="product-description" placeholder="Ex: O mais novo smartphone com câmera de 200MP" value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} /></div>
//                            <div className="space-y-2"><Label htmlFor="product-image">URL da Imagem</Label><Input id="product-image" placeholder="https:exemplo.com/imagem.png" value={newProduct.image_url} onChange={(e) => setNewProduct({ ...newProduct, image_url: e.target.value })} /></div>
//                            <Button onClick={handleAddProduct} disabled={isWhatsAppLoading}>
//                              <Plus className="h-4 w-4 mr-2" />
//                              {isWhatsAppLoading ? 'Adicionando...' : 'Adicionar ao Catálogo da Meta'}
//                            </Button>
//                          </CardContent>
//                        </Card>
//                      </TabsContent>
//             </Tabs>
//         </div>
//     </div>
//   );
// }



// src/components/AdminPanel.tsx

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
  Plus,
  ArrowLeft,
  Loader2,
  CreditCard,
  Save
} from "lucide-react";
import { useWhatsApp } from "@/hooks/useWhatsApp";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// --- Interfaces ---
interface Order {
  id: string;
  customerName: string;
  customerPhoneNumber: string;
  customerContactId: string;
  customerCpfCnpj: string | null;
  items: Array<{ product_retailer_id: string, quantity: string; item_price: string }>;
  total: number;
  status: string;
  createdAt: string;
  tracking_code: string | null;
}

interface AdminPanelProps {
    orderId?: string | null;
    onBackToChat: () => void;
}

export function AdminPanel({ orderId, onBackToChat }: AdminPanelProps) {
  const { addProductToCatalog, sendPaymentLink, loading: isWhatsAppLoading } = useWhatsApp();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState(orderId ? 'orders' : 'products');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(orderId); // NOVO: Controla a vista de detalhe
  const [isSaving, setIsSaving] = useState(false);
  
  const [customerCpf, setCustomerCpf] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const [trackingCode, setTrackingCode] = useState("");

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
            .select(`*, conversation:whatsapp_conversations(contact:whatsapp_contacts(id, name, phone_number, cpf_cnpj))`)
            .order('created_at', { ascending: false });

        if (error) { console.error("Erro ao buscar pedidos:", error); return; }
        
        const formattedOrders: Order[] = data?.map((o: any) => ({
            id: o.id,
            customerName: o.conversation?.contact?.name || 'Desconhecido',
            customerPhoneNumber: o.conversation?.contact?.phone_number,
            customerContactId: o.conversation?.contact?.id,
            customerCpfCnpj: o.conversation?.contact?.cpf_cnpj,
            items: o.products,
            total: o.products.reduce((acc: number, item: any) => acc + (parseFloat(item.item_price) * parseInt(item.quantity, 10)), 0),
            status: o.status,
            createdAt: o.created_at,
            tracking_code: o.tracking_code,
        })) || [];
        setOrders(formattedOrders);
    };
    fetchOrders();
  }, []);

  // Sincroniza o ID do pedido vindo do chat com o estado local
  useEffect(() => {
    setSelectedOrderId(orderId);
    if (orderId) {
      setActiveTab('orders');
    }
  }, [orderId]);
  
  // Encontra o pedido selecionado na lista de pedidos já carregada
  const detailedOrder = orders.find(o => o.id === selectedOrderId);

  // Efeito para preencher os campos do formulário quando um pedido é selecionado
  useEffect(() => {
    if (detailedOrder) {
        setCustomerCpf(detailedOrder.customerCpfCnpj || "");
        setOrderStatus(detailedOrder.status);
        setTrackingCode(detailedOrder.tracking_code || "");
    }
  }, [detailedOrder]);

const handleSendPayment = async (order: Order) => {
    const finalCpf = order.customerCpfCnpj || customerCpf;
    if (!finalCpf || finalCpf.length < 11) {
        toast({ title: "Erro", description: "Por favor, insira um CPF/CNPJ válido.", variant: "destructive" }); return;
    }

    if (!order.customerCpfCnpj && finalCpf) {
        await supabase.from('whatsapp_contacts').update({ cpf_cnpj: finalCpf }).eq('id', order.customerContactId);
    }
    
    const customerDetails = {
        name: order.customerName,
        cpfCnpj: finalCpf,
        mobilePhone: order.customerPhoneNumber
    };

    const paymentDetails = {
        amount: order.total,
        description: `Pedido #${order.id.substring(0, 8)}`,
    };

    try {
        // --- ALTERAÇÃO AQUI: Passamos o `order.id` como o último argumento ---
        await sendPaymentLink(order.customerPhoneNumber, paymentDetails, customerDetails, order.id);
        toast({ title: "Sucesso!", description: "Link de pagamento enviado para o cliente." });
    } catch (error) {
        toast({ title: "Erro", description: "Não foi possível enviar o link de pagamento.", variant: "destructive" });
    }
  };
  
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
    
  const handleUpdateOrder = async () => {
    if (!detailedOrder) return;
    setIsSaving(true);
    const { error } = await supabase
        .from('whatsapp_orders')
        .update({ status: orderStatus, tracking_code: trackingCode })
        .eq('id', detailedOrder.id);
    
    if (error) {
        toast({ title: "Erro", description: "Não foi possível atualizar o pedido.", variant: "destructive" });
    } else {
        toast({ title: "Sucesso!", description: "Pedido atualizado." });

                setOrders(currentOrders => 
            currentOrders.map(order => 
                order.id === detailedOrder.id 
                    ? { ...order, status: orderStatus, tracking_code: trackingCode } 
                    : order
            )
        );
    }
    setIsSaving(false);
  };  

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'pago': return 'success';
      case 'enviado': return 'info';
      case 'entregue': return 'default';
      case 'cancelado': return 'destructive';
      default: return 'secondary';
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
            <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value); setSelectedOrderId(null); }}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="orders">Pedidos</TabsTrigger>
                    <TabsTrigger value="products">Produtos</TabsTrigger>
                </TabsList>

                <TabsContent value="orders" className="space-y-4">
                    {selectedOrderId && detailedOrder ? (
                        // --- VISTA DE DETALHE DO PEDIDO ---
                        <div>
                            <Button variant="outline" size="sm" onClick={() => setSelectedOrderId(null)} className="mb-4">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Voltar para a lista
                            </Button>
                            <Card>
                                <CardHeader><CardTitle>Detalhes do Pedido #{detailedOrder.id.substring(0, 8)}</CardTitle></CardHeader>
                                 <CardContent className="space-y-6">
                                     <div>
                                         <p className="mb-2"><strong>Cliente:</strong> {detailedOrder.customerName}</p>
                                         <p className="mb-4"><strong>Total:</strong> <span className="font-bold text-lg">R$ {detailedOrder.total.toFixed(2)}</span></p>
                                     </div>
                                     <hr/>
                                     <div className="space-y-2">
                                         <Label htmlFor="customer-cpf">CPF / CNPJ do Cliente</Label>
                                         {detailedOrder.customerCpfCnpj ? (
                                             <p className="text-sm font-medium p-2 bg-muted rounded-md">{detailedOrder.customerCpfCnpj}</p>
                                         ) : (
                                             <Input id="customer-cpf" placeholder="Insira o CPF ou CNPJ para o pagamento" value={customerCpf} onChange={(e) => setCustomerCpf(e.target.value)} />
                                         )}
                                     </div>
                                     <Button onClick={() => handleSendPayment(detailedOrder)} disabled={isWhatsAppLoading || (!detailedOrder.customerCpfCnpj && customerCpf.length < 11)} className="w-full">
                                         <CreditCard className="h-4 w-4 mr-2" />
                                         {isWhatsAppLoading ? 'A Enviar...' : 'Gerar e Enviar Link de Pagamento'}
                                     </Button>
                                     <hr/>
                                     <div>
                                         <h4 className="font-semibold mb-4">Gerir Pedido</h4>
                                         <div className="grid grid-cols-2 gap-4 mb-4">
                                             <div className="space-y-2">
                                                 <Label htmlFor="order-status">Status do Pedido</Label>
                                                 <Select value={orderStatus} onValueChange={setOrderStatus}>
                                                     <SelectTrigger id="order-status"><SelectValue /></SelectTrigger>
                                                     <SelectContent>
                                                         <SelectItem value="recebido">Recebido</SelectItem>
                                                         <SelectItem value="pago">Pago</SelectItem>
                                                         <SelectItem value="processando">Processando</SelectItem>
                                                         <SelectItem value="enviado">Enviado</SelectItem>
                                                         <SelectItem value="entregue">Entregue</SelectItem>
                                                         <SelectItem value="cancelado">Cancelado</SelectItem>
                                                     </SelectContent>
                                                 </Select>
                                             </div>
                                             <div className="space-y-2">
                                                 <Label htmlFor="tracking-code">Código de Rastreio</Label>
                                                 <Input id="tracking-code" placeholder="Insira o código aqui" value={trackingCode} onChange={(e) => setTrackingCode(e.target.value)} disabled={orderStatus !== 'enviado'} />
                                             </div>
                                         </div>
                                         <Button onClick={handleUpdateOrder} disabled={isSaving} className="w-full">
                                             <Save className="h-4 w-4 mr-2" />
                                             {isSaving ? 'A Guardar...' : 'Guardar Alterações'}
                                         </Button>
                                     </div>
                                 </CardContent>
                            </Card>
                        </div>
                    ) : (
                        // --- VISTA DE LISTA DE TODOS OS PEDIDOS ---
                        <Card>
                           <CardHeader><CardTitle>Todos os Pedidos</CardTitle></CardHeader>
                           <CardContent>
                               {orders.length > 0 ? (
                                   <div className="space-y-2">
                                       {orders.map(order => (
                                           <Card 
                                               key={order.id} 
                                               className="hover:bg-muted/50 cursor-pointer transition-colors"
                                               onClick={() => setSelectedOrderId(order.id)} // AQUI ESTÁ A MAGIA
                                           >
                                               <CardContent className="p-4 grid grid-cols-4 items-center gap-4">
                                                   <div>
                                                       <p className="font-semibold text-sm">Pedido #{order.id.substring(0, 8)}</p>
                                                       <p className="text-xs text-muted-foreground">{order.customerName}</p>
                                                   </div>
                                                   <div className="text-center">
                                                        <Badge variant={getStatusVariant(order.status) as any}>{order.status}</Badge>
                                                   </div>
                                                   <div className="text-right">
                                                       <p className="font-bold">R$ {order.total.toFixed(2)}</p>
                                                   </div>
                                                   <div className="text-right">
                                                        <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</p>
                                                   </div>
                                               </CardContent>
                                           </Card>
                                       ))}
                                   </div>
                               ) : (
                                   <p className="text-muted-foreground text-center p-4">Nenhum pedido encontrado.</p>
                               )}
                           </CardContent>
                        </Card>
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
                            <div className="space-y-2"><Label htmlFor="product-image">URL da Imagem</Label><Input id="product-image" placeholder="https:exemplo.com/imagem.png" value={newProduct.image_url} onChange={(e) => setNewProduct({ ...newProduct, image_url: e.target.value })} /></div>
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