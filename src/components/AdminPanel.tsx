
// src/components/AdminPanel.tsx

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
  Plus,
  ArrowLeft,
  Loader2,
  CreditCard,
  Save,
  MoreVertical,
  Trash2,
  ImageOff 
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

interface CatalogProduct {
  id: string;
  retailer_id: string;
  name: string;
  price: string; // O preço formatado, ex: "R$ 53,00"
  description: string;
  image_url: string | null; // A imagem pode ser nula
}

interface AdminPanelProps {
    orderId?: string | null;
    onBackToChat: () => void;
}

export function AdminPanel({ orderId, onBackToChat }: AdminPanelProps) {
  const { 
    addProductToCatalog, 
    sendPaymentLink, 
    sendMessage, 
    getProducts,
    updateProduct,
    deleteProduct,
    loading: isWhatsAppLoading 
  } = useWhatsApp();
  const { toast } = useToast();
  
  const [mainTab, setMainTab] = useState(orderId ? 'orders' : 'products');
  const [statusTab, setStatusTab] = useState('todos');
  const [orders, setOrders] = useState<Order[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(orderId);
  const [editingProduct, setEditingProduct] = useState<CatalogProduct | null>(null);
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
  
  // Efeito para buscar os produtos do catálogo
  useEffect(() => {
    if (mainTab === 'products') {
      const fetchProducts = async () => {
        try {
          const products = await getProducts();
                    console.log("Produtos recebidos da API:", products);

          const formattedProducts = products.map((p: any) => ({
            id: p.id,
            retailer_id: p.retailer_id,
            name: p.name,
            // CORREÇÃO 1: Usar 'formatted_price' e ter um fallback
            price: p.price || 'Sem preço',
            description: p.description,
            // CORREÇÃO 2: A imagem pode ser nula
            image_url: p.image_url || null,
          }));
          setCatalogProducts(formattedProducts);
        } catch (error) {
          toast({ title: "Erro ao buscar produtos", description: (error as Error).message, variant: "destructive" });
        }
      };
      fetchProducts();
    }
  }, [mainTab, getProducts, toast]);

  const filteredOrders = useMemo(() => {
    if (statusTab === 'todos') return orders;
    return orders.filter(order => order.status === statusTab);
  }, [orders, statusTab]);

  const detailedOrder = orders.find(o => o.id === selectedOrderId);

  useEffect(() => {
    setSelectedOrderId(orderId);
    if (orderId) setMainTab('orders');
  }, [orderId]);
  
  useEffect(() => {
    if (detailedOrder) {
        setCustomerCpf(detailedOrder.customerCpfCnpj || "");
        setOrderStatus(detailedOrder.status);
        setTrackingCode(detailedOrder.tracking_code || "");
    }
  }, [detailedOrder]);

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.description || newProduct.price <= 0 || !newProduct.image_url || !newProduct.retailer_id) {
        toast({ title: "Erro de Validação", description: "Por favor, preencha todos os campos do produto.", variant: "destructive" });
        return;
    }
    try {
        await addProductToCatalog(newProduct);
        toast({ title: "Produto Adicionado!", description: "O produto foi adicionado ao catálogo da Meta com sucesso." });
        setNewProduct({ name: '', description: '', price: 0, image_url: '', retailer_id: '' });
        const products = await getProducts();
        setCatalogProducts(products);
    } catch (error) {
        toast({ title: "Erro ao adicionar produto", description: (error as Error).message, variant: "destructive" });
    }
  };

  const handleSendPayment = async (order: Order) => {
    const finalCpf = order.customerCpfCnpj || customerCpf;
    if (!finalCpf || finalCpf.length < 11) {
        toast({ title: "Erro", description: "Por favor, insira um CPF/CNPJ válido.", variant: "destructive" }); return;
    }

    if (!order.customerCpfCnpj && finalCpf) {
        await supabase.from('whatsapp_contacts').update({ cpf_cnpj: finalCpf }).eq('id', order.customerContactId);
    }
    
    const customerDetails = { name: order.customerName, cpfCnpj: finalCpf, mobilePhone: order.customerPhoneNumber };
    const paymentDetails = { amount: order.total, description: `Pedido #${order.id.substring(0, 8)}` };

    try {
        await sendPaymentLink(order.customerPhoneNumber, paymentDetails, customerDetails, order.id);
        toast({ title: "Sucesso!", description: "Link de pagamento enviado para o cliente." });
    } catch (error) {
        toast({ title: "Erro", description: "Não foi possível enviar o link de pagamento.", variant: "destructive" });
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

        let notificationMessage = "";
        const orderIdentifier = `Pedido #${detailedOrder.id.substring(0, 8)}`;
        switch (orderStatus) {
            case 'pago': notificationMessage = `Olá, ${detailedOrder.customerName}! 🎉 Confirmámos o pagamento do seu ${orderIdentifier}. Já estamos a preparar tudo para o envio!`; break;
            case 'processando': notificationMessage = `Boas notícias! O seu ${orderIdentifier} já está em processamento na nossa central.`; break;
            case 'enviado': notificationMessage = trackingCode ? `O seu ${orderIdentifier} foi enviado! 🚚\n\nPode acompanhá-lo com o código de rastreio: *${trackingCode}*` : `O seu ${orderIdentifier} foi enviado! Em breve receberá o código de rastreio.`; break;
            case 'entregue': notificationMessage = `Ótimas notícias! O seu ${orderIdentifier} foi marcado como entregue. Esperamos que goste! 😊`; break;
        }

        if (notificationMessage && detailedOrder.customerPhoneNumber) {
            try {
                await sendMessage(detailedOrder.customerPhoneNumber, notificationMessage);
                toast({ title: "Notificação Enviada", description: "O cliente foi notificado sobre a alteração do status." });
            } catch (e) {
                console.error("Falha ao notificar cliente:", e);
                toast({ title: "Aviso", description: "O status foi atualizado, mas não foi possível notificar o cliente.", variant: "destructive" });
            }
        }
    }
    setIsSaving(false);
  };
  
  const handleUpdateProduct = async () => {
    if (!editingProduct) return;
    // Extrai apenas o número do preço para enviar para a API
    const numericPrice = editingProduct.price.replace(/[^0-9.,]/g, '').replace(',', '.');
    const fieldsToUpdate = {
        name: editingProduct.name,
        // A API da Meta espera o preço em centavos
        price: Math.round(parseFloat(numericPrice) * 100), 
        description: editingProduct.description,
    };
    try {
        await updateProduct(editingProduct.id, fieldsToUpdate);
        toast({ title: "Sucesso!", description: "Produto atualizado." });
        setCatalogProducts(current => current.map(p => p.id === editingProduct.id ? editingProduct : p));
        setEditingProduct(null);
    } catch (error) {
        toast({ title: "Erro ao atualizar", description: (error as Error).message, variant: "destructive" });
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Tem a certeza de que quer apagar este produto? Esta ação não pode ser desfeita.")) return;
    try {
        await deleteProduct(productId);
        toast({ title: "Sucesso!", description: "Produto apagado." });
        setCatalogProducts(current => current.filter(p => p.id !== productId));
    } catch (error) {
        toast({ title: "Erro ao apagar", description: (error as Error).message, variant: "destructive" });
    }
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
            <Tabs value={mainTab} onValueChange={(value) => { setMainTab(value); setSelectedOrderId(null); }}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="orders">Pedidos</TabsTrigger>
                    <TabsTrigger value="products">Produtos</TabsTrigger>
                </TabsList>

                 <TabsContent value="orders" className="space-y-4">
                     {selectedOrderId && detailedOrder ? (
                         <div>
                             <Button variant="outline" size="sm" onClick={() => setSelectedOrderId(null)} className="mb-4">
                                 <ArrowLeft className="h-4 w-4 mr-2" />
                                 Voltar para a lista
                             </Button>
                             <Card>
                                 <CardHeader><CardTitle>Detalhes do Pedido #{detailedOrder.id.substring(0, 8)}</CardTitle></CardHeader>
                                 <CardContent className="space-y-6">
                                     <div>
                                         <div className="mb-2"><strong>Cliente:</strong> {detailedOrder.customerName}</div>
                                         <div className="mb-2"><strong>Status:</strong> <Badge variant={getStatusVariant(detailedOrder.status) as any}>{detailedOrder.status}</Badge></div>
                                     </div>
                                     <div>
                                         <h4 className="font-semibold mb-2">Itens do Pedido</h4>
                                         <div className="border rounded-md">
                                             {detailedOrder.items.map((item, index) => (
                                                 <div key={index} className="flex justify-between items-center p-3 border-b last:border-b-0">
                                                     <div>
                                                         <p className="font-medium">{item.quantity}x {item.product_retailer_id}</p>
                                                         <p className="text-xs text-muted-foreground">R$ {parseFloat(item.item_price).toFixed(2)} cada</p>
                                                     </div>
                                                     <p className="font-semibold">R$ {(parseFloat(item.item_price) * parseInt(item.quantity, 10)).toFixed(2)}</p>
                                                 </div>
                                             ))}
                                             <div className="flex justify-between items-center p-3 bg-muted/50 font-bold">
                                                 <p>Total</p>
                                                 <p>R$ {detailedOrder.total.toFixed(2)}</p>
                                             </div>
                                         </div>
                                     </div>
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
                         <Card>
                            <CardHeader><CardTitle>Todos os Pedidos</CardTitle></CardHeader>
                            <CardContent>
                                <Tabs defaultValue="todos" value={statusTab} onValueChange={setStatusTab}>
                                    <TabsList className="mb-4">
                                        <TabsTrigger value="todos">Todos</TabsTrigger>
                                        <TabsTrigger value="recebido">Recebidos</TabsTrigger>
                                        <TabsTrigger value="pago">Pagos</TabsTrigger>
                                        <TabsTrigger value="processando">Processando</TabsTrigger>
                                        <TabsTrigger value="enviado">Enviados</TabsTrigger>
                                        <TabsTrigger value="entregue">Entregues</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                                {filteredOrders.length > 0 ? (
                                    <div className="space-y-2">
                                        {filteredOrders.map(order => (
                                            <Card 
                                                key={order.id} 
                                                className="hover:bg-muted/50 cursor-pointer transition-colors"
                                                onClick={() => setSelectedOrderId(order.id)}
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
                                    <div className="text-center text-muted-foreground p-8">
                                        <ShoppingCart className="mx-auto h-12 w-12 mb-4" />
                                        <p>Nenhum pedido encontrado neste status.</p>
                                    </div>
                                )}
                            </CardContent>
                         </Card>
                     )}
                 </TabsContent>



                <TabsContent value="products" className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Adicionar Novo Produto</CardTitle></CardHeader>
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
                    <Card>
                        <CardHeader><CardTitle>Produtos no Catálogo</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {isWhatsAppLoading && !catalogProducts.length ? (
                                <p>A carregar produtos...</p>
                            ) : (
                                catalogProducts.map(product => (
                                    <Card key={product.id}>
                                        <CardContent className="p-4 relative">
                                            {/* CORREÇÃO 3: Exibição robusta da imagem */}
                                            <div className="w-full h-40 bg-muted rounded-md mb-4 flex items-center justify-center">
                                                {product.image_url ? (
                                                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover rounded-md"/>
                                                ) : (
                                                    <ImageOff className="h-12 w-12 text-muted-foreground" />
                                                )}
                                            </div>
                                            <h4 className="font-semibold truncate">{product.name}</h4>
                                            <p className="text-sm text-muted-foreground">{product.price}</p>
                                            
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-8 w-8 rounded-full">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => setEditingProduct(product)}>Editar</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDeleteProduct(product.id)} className="text-red-600">Apagar</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Editar Produto</DialogTitle></DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2"><Label>Nome</Label><Input value={editingProduct?.name || ''} onChange={(e) => setEditingProduct(p => p && {...p, name: e.target.value})} /></div>
                                <div className="space-y-2"><Label>Preço (ex: 53.00)</Label><Input type="number" value={editingProduct?.price || ''} onChange={(e) => setEditingProduct(p => p && {...p, price: e.target.value})} /></div>
                                <div className="space-y-2"><Label>Descrição</Label><Input value={editingProduct?.description || ''} onChange={(e) => setEditingProduct(p => p && {...p, description: e.target.value})} /></div>
                            </div>
                            <DialogFooter>
                                <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                                <Button onClick={handleUpdateProduct} disabled={isWhatsAppLoading}>
                                    {isWhatsAppLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : "Guardar Alterações"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </TabsContent>
            </Tabs>
        </div>
    </div>
  );
}