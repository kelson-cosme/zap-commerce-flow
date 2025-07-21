// src/pages/Index.tsx

import { useState, useEffect, useRef } from "react";
import { ChatHeader } from "@/components/ChatHeader";
import { MessageBubble, Message } from "@/components/MessageBubble";
import { ChatInput } from "@/components/ChatInput";
import { CustomerList, Customer } from "@/components/CustomerList";
import { AdminPanel } from "@/components/AdminPanel";
import { WhatsAppStatus } from "@/components/WhatsAppStatus";
import { Button } from "@/components/ui/button";
import { MessageSquare, BarChart3, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWhatsApp, WhatsAppConversation, WhatsAppMessage } from "@/hooks/useWhatsApp";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Este componente visual é usado para mostrar a mensagem de "Catálogo Enviado"
const CatalogSentCard = ({ timestamp, isSent }: { timestamp: string, isSent: boolean }) => {
    const formatTime = (ts: string) => new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return (
        <div className={cn("flex mb-4 animate-message-slide-in", isSent ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-xs lg:max-w-md px-4 py-3 rounded-lg shadow-message", isSent ? "bg-message-sent text-message-sent-foreground" : "bg-message-received text-message-received-foreground")}>
                <div className="flex items-center gap-3 font-medium mb-2 border-b pb-2 border-white/20">
                    <BookOpen className="h-5 w-5" />
                    <h4 className="font-semibold">Catálogo Enviado</h4>
                </div>
                <p className="text-sm opacity-90">Você enviou o catálogo de produtos para este cliente.</p>
                <div className="flex items-center justify-end mt-2"><span className="text-xs opacity-70">{formatTime(timestamp)}</span></div>
            </div>
        </div>
    );
};


const Index = () => {
  const [currentView, setCurrentView] = useState<'chat' | 'admin'>('chat');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [whatsappConversations, setWhatsappConversations] = useState<(WhatsAppConversation & { contact: any })[]>([]);
  
  const { sendMessage, sendCatalog, getConversations, getMessages } = useWhatsApp();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadConversations = async () => {
      try {
        const conversations = await getConversations();
        setWhatsappConversations(conversations);
        if (conversations.length > 0 && !selectedConversationId) {
          setSelectedConversationId(conversations[0].id);
          setSelectedCustomerId(conversations[0].contact?.id);
        }
      } catch (error) { console.error('Error loading conversations:', error); }
    };
    loadConversations();
  }, [getConversations, selectedConversationId]);

  useEffect(() => {
    if (selectedConversationId) {
      const loadMessages = async () => {
        try {
          const msgs = await getMessages(selectedConversationId);
          const convertedMessages: Message[] = msgs.map(msg => ({
            id: msg.id,
            text: msg.content,
            timestamp: msg.timestamp || msg.created_at,
            isSent: !msg.is_from_contact,
            isDelivered: msg.status === 'delivered' || msg.status === 'read',
            isRead: msg.status === 'read',
            type: msg.message_type as any,
            metadata: msg.metadata as any
          }));
          setMessages(convertedMessages);
        } catch (error) { console.error('Error loading messages:', error); }
      };
      loadMessages();
    }
  }, [selectedConversationId, getMessages]);

  useEffect(() => {
    const channel = supabase.channel('whatsapp_updates').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' },
      (payload) => {
        const newMessage = payload.new as WhatsAppMessage;
        if (newMessage.conversation_id === selectedConversationId) {
          const convertedMessage: Message = {
            id: newMessage.id,
            text: newMessage.content,
            timestamp: newMessage.timestamp || newMessage.created_at,
            isSent: !newMessage.is_from_contact,
            isDelivered: newMessage.status === 'delivered' || newMessage.status === 'read',
            isRead: newMessage.status === 'read',
            type: newMessage.message_type as any,
            metadata: newMessage.metadata as any
          };
          setMessages(prev => [...prev, convertedMessage]);
        }
      }
    ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedConversationId]);

  const customers: Customer[] = whatsappConversations.map(conv => ({
    id: conv.contact?.id || conv.id,
    name: conv.contact?.name || conv.contact?.phone_number || 'Cliente',
    avatar: conv.contact?.profile_pic_url || '',
    lastMessage: 'Última mensagem...',
    timestamp: conv.last_message_at || conv.created_at,
    isOnline: false,
    unreadCount: 0,
    status: 'active' as const
  }));
  
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
  useEffect(() => { scrollToBottom(); }, [messages]);

  const handleSendMessage = async (text: string) => {
    if (!selectedCustomer || !selectedConversationId) return;
    const whatsappConv = whatsappConversations.find(conv => conv.contact?.id === selectedCustomerId);
    if (!whatsappConv?.contact?.phone_number) return;
    
    const optimisticMessage: Message = {
        id: Date.now().toString(),
        text: text,
        timestamp: new Date().toISOString(),
        isSent: true,
        type: 'text',
    };
    setMessages(prev => [...prev, optimisticMessage]);
    try {
      await sendMessage(whatsappConv.contact.phone_number, text);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({ title: "Erro", description: "Falha ao enviar mensagem", variant: "destructive" });
    }
  };

  const handleSendCatalog = async () => {
    if (!selectedCustomer || !selectedConversationId) {
      toast({ title: "Erro", description: "Nenhuma conversa selecionada", variant: "destructive" });
      return;
    }
  
    const whatsappConv = whatsappConversations.find(conv => conv.contact?.id === selectedCustomerId);
    if (!whatsappConv?.contact?.phone_number) {
      toast({ title: "Erro", description: "Número de telefone não encontrado", variant: "destructive" });
      return;
    }
  
    const optimisticCatalogMessage: Message = {
        id: Date.now().toString(),
        text: 'Catálogo de produtos enviado.',
        timestamp: new Date().toISOString(),
        isSent: true,
        type: 'catalog',
    };
    setMessages(prev => [...prev, optimisticCatalogMessage]);
  
    try {
      await sendCatalog(whatsappConv.contact.phone_number);
      toast({ title: "Catálogo enviado", description: "O catálogo foi enviado com sucesso para o cliente." });
    } catch (error) {
      console.error('Error sending catalog:', error);
      toast({ title: "Erro", description: "Falha ao enviar o catálogo.", variant: "destructive" });
    }
  };

  const handleSendPayment = () => {
    // A sua lógica de pagamento aqui
  };

  if (currentView === 'admin') {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b p-4 bg-whatsapp-green">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-white">Painel Administrativo</h1>
            <Button variant="ghost" onClick={() => setCurrentView('chat')} className="text-white hover:bg-whatsapp-green-dark">
              <MessageSquare className="h-5 w-5 mr-2" />
              Voltar ao Chat
            </Button>
          </div>
        </div>
        <AdminPanel />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-chat-bg flex">
      <div className="fixed left-0 top-0 h-screen z-10">
        <div className="flex flex-col h-full">
          <WhatsAppStatus />
          <CustomerList
            customers={customers}
            selectedCustomerId={selectedCustomerId}
            onSelectCustomer={(customerId) => {
              setSelectedCustomerId(customerId);
              const conv = whatsappConversations.find(c => c.contact?.id === customerId);
              if (conv) { setSelectedConversationId(conv.id); }
            }}
          />
        </div>
      </div>
      <div className="flex-1 flex flex-col ml-80">
        {selectedCustomer ? (
          <>
            <div className="fixed top-0 right-0 left-80 z-10 bg-background border-b">
              <ChatHeader
                customerName={selectedCustomer.name}
                customerAvatar={selectedCustomer.avatar}
                isOnline={selectedCustomer.isOnline}
              />
              <div className="p-2 border-b bg-background">
                <Button variant="outline" size="sm" onClick={() => setCurrentView('admin')} className="ml-auto flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Painel Admin
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 mt-32">
              {messages.map((message) => {
                if (message.type === 'catalog' && message.isSent) {
                  return <CatalogSentCard key={message.id} timestamp={message.timestamp} isSent={message.isSent} />;
                }
                // A MessageBubble já contém a lógica para renderizar pedidos ('order')
                return <MessageBubble key={message.id} message={message} />;
              })}
              <div ref={messagesEndRef} />
            </div>
            <ChatInput
              onSendMessage={handleSendMessage}
              onSendCatalog={handleSendCatalog}
              onSendPayment={handleSendPayment}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">Selecione uma conversa</p>
              <p className="text-muted-foreground">Escolha um cliente para começar a conversar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;