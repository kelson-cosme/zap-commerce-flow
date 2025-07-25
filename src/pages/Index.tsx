


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
import { NotificationBell } from "@/components/NotificationBell"; // Importe o novo componente

const Index = () => {
  const [currentView, setCurrentView] = useState<'chat' | 'admin'>('chat');
  const [viewingOrderId, setViewingOrderId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [whatsappConversations, setWhatsappConversations] = useState<(WhatsAppConversation & { contact: any, last_message: any })[]>([]);
  
  const { sendMessage, sendCatalog, getConversations, getMessages, loading } = useWhatsApp();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Efeito para carregar as conversas
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const conversations = await getConversations();
        setWhatsappConversations(conversations as any);
        if (conversations.length > 0 && !selectedConversationId) {
          setSelectedConversationId(conversations[0].id);
          setSelectedCustomerId(conversations[0].contact?.id);
        }
      } catch (error) { console.error('Error loading conversations:', error); }
    };
    loadConversations();
  }, [getConversations, selectedConversationId]);

  // Efeito para carregar as mensagens de uma conversa selecionada
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

  // Efeito para ouvir novas mensagens e atualizações de conversas em tempo real
  useEffect(() => {
    const messagesChannel = supabase
      .channel('whatsapp_messages_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' },
      (payload) => {
        const newMessage = payload.new as WhatsAppMessage;
        if (newMessage.conversation_id === selectedConversationId) {
          const convertedMessage: Message = {
            id: newMessage.id,
            text: newMessage.content,
            timestamp: newMessage.timestamp || newMessage.created_at,
            isSent: !newMessage.is_from_contact,
            type: newMessage.message_type as any,
            metadata: newMessage.metadata as any
          };
          setMessages(prev => [...prev, convertedMessage]);

          supabase.rpc('reset_unread_count', { conv_id: newMessage.conversation_id }).then();

        }
      })
      .subscribe();

    const conversationsChannel = supabase
      .channel('whatsapp_conversations_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_conversations' },
      (payload) => {
          const updatedConv = payload.new as WhatsAppConversation;
          setWhatsappConversations(currentConvs => 
              currentConvs.map(conv => 
                  conv.id === updatedConv.id ? { ...conv, ...updatedConv } : conv
              )
          );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(conversationsChannel);
    };
  }, [selectedConversationId]);

  const customers: Customer[] = whatsappConversations.map(conv => ({
    id: conv.contact?.id || conv.id,
    name: conv.contact?.name || conv.contact?.phone_number || 'Cliente',
    avatar: conv.contact?.profile_pic_url || '',
    lastMessage: conv.last_message?.content || 'Última mensagem...',
    timestamp: conv.last_message_at || conv.created_at,
    isOnline: false,
    unreadCount: conv.unread_count || 0,
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

  const handleSelectCustomer = async (customerId: string) => {
      setSelectedCustomerId(customerId);
      const conv = whatsappConversations.find(c => c.contact?.id === customerId);
      if (conv) {
          setSelectedConversationId(conv.id);
          if (conv.unread_count > 0) {
              await supabase.rpc('reset_unread_count', { conv_id: conv.id });
              setWhatsappConversations(currentConvs => 
                  currentConvs.map(c => 
                      c.id === conv.id ? { ...c, unread_count: 0 } : c
                  )
              );
          }
      }
  };

  const handleSendMessage = async (text: string) => {
    if (!selectedCustomer || !selectedConversationId) return;
    const whatsappConv = whatsappConversations.find(conv => conv.contact?.id === selectedCustomerId);
    if (!whatsappConv?.contact?.phone_number) return;
    
    try {
      await sendMessage(whatsappConv.contact.phone_number, text);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({ title: "Erro", description: "Falha ao enviar mensagem", variant: "destructive" });
    }
  };

  const handleSendCatalog = async () => {
    if (!selectedCustomer || !selectedConversationId) return;
    const whatsappConv = whatsappConversations.find(conv => conv.contact?.id === selectedCustomerId);
    if (!whatsappConv?.contact?.phone_number) return;
    
    try {
      await sendCatalog(whatsappConv.contact.phone_number);
      toast({ title: "Catálogo enviado", description: "O catálogo foi enviado com sucesso para o cliente." });
    } catch (error) {
      console.error('Error sending catalog:', error);
      toast({ title: "Erro", description: "Falha ao enviar o catálogo.", variant: "destructive" });
    }
  };
  
  const handleSendPayment = () => { /* A lógica agora está no AdminPanel */ };

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
            onSelectCustomer={handleSelectCustomer}
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
              >
                <NotificationBell onViewOrder={handleViewOrder} />
              </ChatHeader>
              <div className="p-2 border-b bg-background flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setCurrentView('admin')} className="flex items-center gap-2">
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