import { useState, useEffect, useRef } from "react";
import { ChatHeader } from "@/components/ChatHeader";
import { MessageBubble, Message } from "@/components/MessageBubble";
import { ChatInput } from "@/components/ChatInput";
import { CustomerList, Customer } from "@/components/CustomerList";
import { AdminPanel } from "@/components/AdminPanel";
import { Button } from "@/components/ui/button";
import { Settings, MessageSquare, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const Index = () => {
  const [currentView, setCurrentView] = useState<'chat' | 'admin'>('chat');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('1');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Olá! Gostaria de ver os produtos disponíveis.',
      timestamp: '2024-01-15T10:30:00Z',
      isSent: false,
      isDelivered: true,
      isRead: true
    },
    {
      id: '2',
      text: 'Oi! Claro, vou enviar nosso catálogo para você.',
      timestamp: '2024-01-15T10:31:00Z',
      isSent: true,
      isDelivered: true,
      isRead: true
    }
  ]);

  const [customers] = useState<Customer[]>([
    {
      id: '1',
      name: 'João Silva',
      avatar: '',
      lastMessage: 'Oi! Claro, vou enviar nosso catálogo para você.',
      timestamp: '2024-01-15T10:31:00Z',
      isOnline: true,
      unreadCount: 0,
      status: 'active'
    },
    {
      id: '2', 
      name: 'Maria Santos',
      avatar: '',
      lastMessage: 'Quando chegará meu pedido?',
      timestamp: '2024-01-15T09:15:00Z',
      isOnline: false,
      unreadCount: 2,
      status: 'pending'
    },
    {
      id: '3',
      name: 'Pedro Costa',
      avatar: '',
      lastMessage: 'Obrigado! Produto chegou perfeito.',
      timestamp: '2024-01-14T16:45:00Z',
      isOnline: false,
      unreadCount: 0,
      status: 'completed'
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (text: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      timestamp: new Date().toISOString(),
      isSent: true,
      isDelivered: false,
      isRead: false
    };
    setMessages(prev => [...prev, newMessage]);

    // Simulate delivery and read status
    setTimeout(() => {
      setMessages(prev => prev.map(msg => 
        msg.id === newMessage.id 
          ? { ...msg, isDelivered: true }
          : msg
      ));
    }, 1000);

    setTimeout(() => {
      setMessages(prev => prev.map(msg => 
        msg.id === newMessage.id 
          ? { ...msg, isRead: true }
          : msg
      ));
    }, 2000);
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
        <CustomerList
          customers={customers}
          selectedCustomerId={selectedCustomerId}
          onSelectCustomer={setSelectedCustomerId}
        />
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
