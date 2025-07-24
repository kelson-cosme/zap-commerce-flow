// src/pages/Index.tsx

import { useState, useEffect, useRef } from "react";
import { ChatHeader } from "@/components/ChatHeader";
import { MessageBubble, Message } from "@/components/MessageBubble";
import { ChatInput } from "@/components/ChatInput";
import { CustomerList, Customer } from "@/components/CustomerList";
import { AdminPanel } from "@/components/AdminPanel";
import { WhatsAppStatus } from "@/components/WhatsAppStatus";
import { Button } from "@/components/ui/button";
import { MessageSquare, BarChart3 } from "lucide-react";
import { useWhatsApp, WhatsAppConversation, WhatsAppMessage } from "@/hooks/useWhatsApp";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [currentView, setCurrentView] = useState<'chat' | 'admin'>('chat');
  const [viewingOrderId, setViewingOrderId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [whatsappConversations, setWhatsappConversations] = useState<(WhatsAppConversation & { contact: any })[]>([]);
  
  const { sendMessage, sendCatalog, getConversations, getMessages, loading } = useWhatsApp();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ... (useEffect para carregar conversas e mensagens iniciais não muda)
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


  // O useEffect de tempo real permanece, agora como a única fonte de novas mensagens
  useEffect(() => {
    const channel = supabase
      .channel('whatsapp_updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' },
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
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  const handleViewOrder = (orderId: string) => {
    setViewingOrderId(orderId);
    setCurrentView('admin');
  };
  
  const handleBackToChat = () => {
      setCurrentView('chat');
      setViewingOrderId(null);
  };

  // --- FUNÇÃO CORRIGIDA ---
  const handleSendMessage = async (text: string) => {
    if (!selectedCustomer || !selectedConversationId) return;
    const whatsappConv = whatsappConversations.find(conv => conv.contact?.id === selectedCustomerId);
    if (!whatsappConv?.contact?.phone_number) return;
    
    // REMOVIDA A ATUALIZAÇÃO OTIMISTA DAQUI
    
    try {
      await sendMessage(whatsappConv.contact.phone_number, text);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({ title: "Erro", description: "Falha ao enviar mensagem", variant: "destructive" });
    }
  };

  // --- FUNÇÃO CORRIGIDA ---
  const handleSendCatalog = async () => {
    if (!selectedCustomer || !selectedConversationId) return;
  
    const whatsappConv = whatsappConversations.find(conv => conv.contact?.id === selectedCustomerId);
    if (!whatsappConv?.contact?.phone_number) return;
  
    // Adiciona a mensagem otimista ao histórico do chat
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
      // Opcional: remover a mensagem otimista em caso de erro
      setMessages(prev => prev.filter(msg => msg.id !== optimisticCatalogMessage.id));
    }
  };
  
  const handleSendPayment = () => { /* ... */ };

  if (currentView === 'admin') {
    return (<AdminPanel orderId={viewingOrderId} onBackToChat={handleBackToChat} />);
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
              {messages.map((message) => 
                <MessageBubble 
                    key={message.id} 
                    message={message} 
                    onViewOrder={handleViewOrder}
                />
              )}
              <div ref={messagesEndRef} />
            </div>
            <ChatInput
              onSendMessage={handleSendMessage}
              onSendCatalog={handleSendCatalog}
              onSendPayment={handleSendPayment}
              isLoading={loading}

            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            {/* ... */}
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;