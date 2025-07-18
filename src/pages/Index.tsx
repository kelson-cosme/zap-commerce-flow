import { useState, useEffect, useRef } from "react";
import { ChatHeader } from "@/components/ChatHeader";
import { MessageBubble, Message } from "@/components/MessageBubble";
import { ChatInput } from "@/components/ChatInput";
import { CustomerList, Customer } from "@/components/CustomerList";
import { AdminPanel } from "@/components/AdminPanel";
import { WhatsAppStatus } from "@/components/WhatsAppStatus";
import { Button } from "@/components/ui/button";
import { Settings, MessageSquare, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWhatsApp, WhatsAppConversation, WhatsAppMessage } from "@/hooks/useWhatsApp";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [currentView, setCurrentView] = useState<'chat' | 'admin'>('chat');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [whatsappConversations, setWhatsappConversations] = useState<(WhatsAppConversation & { contact: any })[]>([]);
  const [whatsappMessages, setWhatsappMessages] = useState<WhatsAppMessage[]>([]);
  
  const { sendMessage, getConversations, getMessages, loading } = useWhatsApp();
  const { toast } = useToast();

  // Load WhatsApp conversations on component mount
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const conversations = await getConversations();
        setWhatsappConversations(conversations);
        
        // Select first conversation if none selected
        if (conversations.length > 0 && !selectedConversationId) {
          setSelectedConversationId(conversations[0].id);
          setSelectedCustomerId(conversations[0].contact?.id);
        }
      } catch (error) {
        console.error('Error loading conversations:', error);
      }
    };

    loadConversations();
  }, [getConversations]);

  // Load messages when conversation changes
  useEffect(() => {
    if (selectedConversationId) {
      const loadMessages = async () => {
        try {
          const msgs = await getMessages(selectedConversationId);
          setWhatsappMessages(msgs);
          
          // Convert WhatsApp messages to Message format
          const convertedMessages: Message[] = msgs.map(msg => ({
            id: msg.id,
            text: msg.content,
            timestamp: msg.timestamp || msg.created_at,
            isSent: !msg.is_from_contact,
            isDelivered: msg.status === 'delivered' || msg.status === 'read',
            isRead: msg.status === 'read',
            type: msg.message_type === 'text' ? undefined : msg.message_type as any
          }));
          
          setMessages(convertedMessages);
        } catch (error) {
          console.error('Error loading messages:', error);
        }
      };

      loadMessages();
    }
  }, [selectedConversationId, getMessages]);

  // Listen for real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('whatsapp_updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'whatsapp_messages'
      }, (payload) => {
        const newMessage = payload.new as WhatsAppMessage;
        if (newMessage.conversation_id === selectedConversationId) {
          const convertedMessage: Message = {
            id: newMessage.id,
            text: newMessage.content,
            timestamp: newMessage.timestamp || newMessage.created_at,
            isSent: !newMessage.is_from_contact,
            isDelivered: newMessage.status === 'delivered' || newMessage.status === 'read',
            isRead: newMessage.status === 'read',
            type: newMessage.message_type === 'text' ? undefined : newMessage.message_type as any
          };
          setMessages(prev => [...prev, convertedMessage]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversationId]);

  // Convert WhatsApp conversations to Customer format
  const customers: Customer[] = whatsappConversations.map(conv => ({
    id: conv.contact?.id || conv.id,
    name: conv.contact?.name || conv.contact?.phone_number || 'Cliente',
    avatar: conv.contact?.profile_pic_url || '',
    lastMessage: 'Última mensagem...',
    timestamp: conv.last_message_at || conv.created_at,
    isOnline: false, // We don't track online status yet
    unreadCount: 0, // We don't track unread count yet
    status: 'active' as const
  }));

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    if (!selectedCustomer || !selectedConversationId) {
      toast({
        title: "Erro",
        description: "Nenhuma conversa selecionada",
        variant: "destructive"
      });
      return;
    }

    // Find the WhatsApp conversation to get the phone number
    const whatsappConv = whatsappConversations.find(conv => conv.contact?.id === selectedCustomerId);
    if (!whatsappConv?.contact?.phone_number) {
      toast({
        title: "Erro",
        description: "Número de telefone não encontrado",
        variant: "destructive"
      });
      return;
    }

    try {
      // Send via WhatsApp API
      await sendMessage(whatsappConv.contact.phone_number, text);
      
      toast({
        title: "Mensagem enviada",
        description: "Sua mensagem foi enviada com sucesso",
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erro",
        description: "Falha ao enviar mensagem",
        variant: "destructive"
      });
    }
  };

  const handleSendCatalog = () => {
    const catalogMessage: Message = {
      id: Date.now().toString(),
      text: 'Aqui está nosso catálogo de produtos:',
      timestamp: new Date().toISOString(),
      isSent: true,
      type: 'catalog',
      catalogData: {
        products: [
          { id: '1', name: 'Smartphone Galaxy S23', price: 2499.99, image: '/placeholder.svg' },
          { id: '2', name: 'Notebook Dell Inspiron', price: 3299.00, image: '/placeholder.svg' },
          { id: '3', name: 'Fone Bluetooth Premium', price: 299.99, image: '/placeholder.svg' },
          { id: '4', name: 'Tablet iPad Air', price: 1899.00, image: '/placeholder.svg' },
          { id: '5', name: 'Smartwatch Apple', price: 899.99, image: '/placeholder.svg' }
        ]
      }
    };
    setMessages(prev => [...prev, catalogMessage]);
  };

  const handleSendPayment = () => {
    const paymentMessage: Message = {
      id: Date.now().toString(),
      text: 'Link de pagamento gerado:',
      timestamp: new Date().toISOString(),
      isSent: true,
      type: 'payment',
      paymentData: {
        amount: 2499.99,
        description: 'Smartphone Galaxy S23',
        link: 'https://payment.example.com/pay/123456'
      }
    };
    setMessages(prev => [...prev, paymentMessage]);
  };

  if (currentView === 'admin') {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b p-4 bg-whatsapp-green">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-white">Painel Administrativo</h1>
            <Button
              variant="ghost"
              onClick={() => setCurrentView('chat')}
              className="text-white hover:bg-whatsapp-green-dark"
            >
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
      {/* Customer List - Fixed */}
      <div className="fixed left-0 top-0 h-screen z-10">
        <div className="flex flex-col h-full">
          <WhatsAppStatus />
          <CustomerList
            customers={customers}
            selectedCustomerId={selectedCustomerId}
            onSelectCustomer={(customerId) => {
              setSelectedCustomerId(customerId);
              // Find the corresponding conversation ID
              const conv = whatsappConversations.find(c => c.contact?.id === customerId);
              if (conv) {
                setSelectedConversationId(conv.id);
              }
            }}
          />
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col ml-80">
        {selectedCustomer ? (
          <>
            {/* Chat Header - Fixed */}
            <div className="fixed top-0 right-0 left-80 z-10 bg-background border-b">
              <ChatHeader
                customerName={selectedCustomer.name}
                customerAvatar={selectedCustomer.avatar}
                isOnline={selectedCustomer.isOnline}
              />

              {/* Admin Button */}
              <div className="p-2 border-b bg-background">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentView('admin')}
                  className="ml-auto flex items-center gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  Painel Admin
                </Button>
              </div>
            </div>

            {/* Messages - with top margin for fixed header */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 mt-32">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
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
