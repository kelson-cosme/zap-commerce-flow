

// // src/pages/Index.tsx

// import { useState, useEffect, useRef, useMemo, useCallback } from "react";
// import { ChatHeader } from "@/components/ChatHeader";
// import { MessageBubble, Message } from "@/components/MessageBubble";
// import { ChatInput } from "@/components/ChatInput";
// import { CustomerList, Customer } from "@/components/CustomerList";
// import { AdminPanel } from "@/components/AdminPanel";
// import { WhatsAppStatus } from "@/components/WhatsAppStatus";
// import { Button } from "@/components/ui/button";
// import { MessageSquare, BarChart3, LogOut, Loader2 } from "lucide-react";
// import { useWhatsApp, WhatsAppConversation, WhatsAppMessage } from "@/hooks/useWhatsApp";
// import { supabase } from "@/integrations/supabase/client";
// import { useToast } from "@/hooks/use-toast";
// import { NotificationBell } from "@/components/NotificationBell";
// import { useSession } from "@/hooks/useSession";
// import { useProfile } from "@/hooks/useProfile";

// const Index = () => {
//   const { session } = useSession();
//   const { profile, loading: loadingProfile } = useProfile();
//   const [currentView, setCurrentView] = useState<'chat' | 'admin'>('chat');
//   const [viewingOrderId, setViewingOrderId] = useState<string | null>(null);
//   const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
//   const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
//   const [messages, setMessages] = useState<Message[]>([]);
//   const [whatsappConversations, setWhatsappConversations] = useState<(WhatsAppConversation & { contact: any, last_message: any })[]>([]);
//   const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  
//   const { sendMessage, sendCatalog, getConversations, getMessages, loading } = useWhatsApp();
//   const { toast } = useToast();
//   const messagesEndRef = useRef<HTMLDivElement>(null);

//   // Efeito para carregar as conversas, dependente da sessão do utilizador
//   useEffect(() => {
//     const loadConversations = async () => {
//       if (!session) return;
//       setIsLoadingConversations(true);
//       try {
//         const conversations = await getConversations();
//         setWhatsappConversations(conversations as any);
//       } catch (error) { 
//         console.error('Error loading conversations:', error); 
//         toast({ title: "Erro", description: "Não foi possível carregar as conversas.", variant: "destructive" });
//       } finally {
//         setIsLoadingConversations(false);
//       }
//     };
//     loadConversations();
//   }, [session, getConversations, toast]);

//   // Efeito para carregar as mensagens de uma conversa selecionada
//   useEffect(() => {
//     if (selectedConversationId) {
//       const loadMessages = async () => {
//         try {
//           const msgs = await getMessages(selectedConversationId);
//           const convertedMessages: Message[] = msgs.map(msg => ({
//             id: msg.id, text: msg.content, timestamp: msg.timestamp || msg.created_at, isSent: !msg.is_from_contact, type: msg.message_type as any, metadata: msg.metadata as any
//           }));
//           setMessages(convertedMessages);
//         } catch (error) { console.error('Error loading messages:', error); }
//       };
//       loadMessages();
//     } else {
//       setMessages([]);
//     }
//   }, [selectedConversationId, getMessages]);

//   // Efeito para ouvir novas mensagens e atualizações de conversas em tempo real
//   useEffect(() => {
//     const messagesChannel = supabase
//       .channel('whatsapp_messages_realtime')
//       .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' },
//       (payload) => {
//         const newMessage = payload.new as WhatsAppMessage;
//         if (newMessage.conversation_id === selectedConversationId) {
//           const convertedMessage: Message = {
//             id: newMessage.id, text: newMessage.content, timestamp: newMessage.timestamp || newMessage.created_at, isSent: !newMessage.is_from_contact, type: newMessage.message_type as any, metadata: newMessage.metadata as any
//           };
//           setMessages(prev => [...prev, convertedMessage]);
//           supabase.rpc('reset_unread_count', { conv_id: newMessage.conversation_id }).then();
//         }
//       })
//       .subscribe();

//     const conversationsChannel = supabase
//       .channel('whatsapp_conversations_realtime')
//       .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_conversations' },
//       async (payload) => {
//           if (payload.eventType === 'INSERT') {
//             const { data: newConv } = await supabase.from('conversations_with_last_message').select('*').eq('conversation_id', payload.new.id).single();
//             if (newConv) {
//                 setWhatsappConversations(currentConvs => [newConv as any, ...currentConvs]);
//             }
//           } else if (payload.eventType === 'UPDATE') {
//             const updatedConv = payload.new as WhatsAppConversation;
//             setWhatsappConversations(currentConvs => 
//                 currentConvs.map(conv => 
//                     conv.id === updatedConv.id ? { ...conv, ...updatedConv } : conv
//                 ).sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
//             );
//           }
//       })
//       .subscribe();

//     return () => {
//       supabase.removeChannel(messagesChannel);
//       supabase.removeChannel(conversationsChannel);
//     };
//   }, [selectedConversationId]);

//   // Filtra as conversas em "Fila" e "Meus Atendimentos"
//   const { queue, myChats } = useMemo(() => {
//     const queue = whatsappConversations.filter(c => c.assigned_to === null);
//     const myChats = whatsappConversations.filter(c => c.assigned_to === session?.user?.id);
//     return { queue, myChats };
//   }, [whatsappConversations, session]);

//   const customers: Customer[] = whatsappConversations.map(conv => ({
//     id: conv.contact?.id || conv.id, name: conv.contact?.name || conv.contact?.phone_number || 'Cliente', avatar: conv.contact?.profile_pic_url || '', lastMessage: conv.last_message?.content || 'Última mensagem...', timestamp: conv.last_message_at || conv.created_at, unreadCount: conv.unread_count || 0, conversationId: conv.id, isOnline: false, status: 'active' as const,
//   }));
  
//   const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

//   const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
//   useEffect(() => { scrollToBottom(); }, [messages]);

//   const handleViewOrder = (orderId: string) => { setViewingOrderId(orderId); setCurrentView('admin'); };
//   const handleBackToChat = () => { setCurrentView('chat'); setViewingOrderId(null); };
  
//   const handleSelectCustomer = async (customerId: string) => {
//       setSelectedCustomerId(customerId);
//       const conv = whatsappConversations.find(c => c.contact?.id === customerId);
//       if (conv) {
//           setSelectedConversationId(conv.id);
//           if (conv.unread_count > 0) {
//               await supabase.rpc('reset_unread_count', { conv_id: conv.id });
//               setWhatsappConversations(currentConvs => 
//                   currentConvs.map(c => 
//                       c.id === conv.id ? { ...c, unread_count: 0 } : c
//                   )
//               );
//           }
//       }
//   };

//   const handleUnassignChat = useCallback(async () => {
//     if (!selectedConversationId) return;
//     const { error } = await supabase.rpc('unassign_conversation', { conv_id: selectedConversationId });
//     if (error) {
//         toast({ title: "Erro", description: "Não foi possível devolver a conversa à fila.", variant: "destructive" }); return;
//     }
//     setWhatsappConversations(currentConvs => 
//         currentConvs.map(c => 
//             c.id === selectedConversationId ? { ...c, assigned_to: null } : c
//         )
//     );
//     setSelectedConversationId(null);
//     setSelectedCustomerId(null);
//     toast({ title: "Sucesso", description: "A conversa foi devolvida à fila." });
//   }, [selectedConversationId, toast]);

//   const handleAssignChat = useCallback(async (conversationId: string) => {
//     if (!session?.user?.id || !profile?.full_name) {
//         toast({ title: "Erro", description: "Perfil do utilizador não encontrado.", variant: "destructive" }); return;
//     }
//     const convToAssign = whatsappConversations.find(c => c.id === conversationId);
//     if (!convToAssign?.contact?.phone_number) return;

//     const { error } = await supabase.rpc('assign_conversation', { conv_id: conversationId, agent_id: session.user.id });
//     if (error) {
//         toast({ title: "Erro", description: "Não foi possível atender à conversa.", variant: "destructive" }); return;
//     }

//     const greetingMessage = `Olá! O meu nome é ${profile.full_name} e serei eu a tratar do seu atendimento. 👋`;
//     try {
//         await sendMessage(convToAssign.contact.phone_number, greetingMessage);
//     } catch (e) {
//         toast({ title: "Aviso", description: "A conversa foi atribuída, mas não foi possível enviar a mensagem de saudação.", variant: "destructive" });
//     }

//     setWhatsappConversations(currentConvs => {
//         const conv = currentConvs.find(c => c.id === conversationId);
//         if (!conv) return currentConvs;
//         setSelectedCustomerId(conv.contact.id);
//         setSelectedConversationId(conv.id);
//         return currentConvs.map(c => 
//             c.id === conversationId ? { ...c, assigned_to: session.user.id, unread_count: 0 } : c
//         );
//     });
//   }, [session, profile, toast, sendMessage, whatsappConversations]);

//   const handleSendMessage = async (text: string) => {
//     if (!selectedCustomer || !selectedConversationId || !session?.user?.id || !profile?.full_name) {
//         toast({ title: "Erro", description: "Não é possível enviar a mensagem. Verifique se uma conversa está selecionada e se o seu perfil está carregado.", variant: "destructive" });
//         return;
//     }
//         const conv = whatsappConversations.find(c => c.id === selectedConversationId);
//     if (!conv || !conv.contact?.phone_number) return;

//     if (conv.assigned_to === null) {
//       await handleAssignChat(selectedConversationId);
//     }
//     // const messageToSend = `*Atendente: ${profile.full_name}*\n${text}`;

//     const messageToSend = "`Atendente: "+ profile.full_name +"`";


//     // Reintroduzimos a atualização otimista para uma melhor experiência
//     const optimisticMessage: Message = {
//         id: Date.now().toString(),
//         text: text, // Na nossa UI, mostramos apenas o texto original
//         timestamp: new Date().toISOString(),
//         isSent: true,
//         type: 'text',
//     };
//     setMessages(prev => [...prev, optimisticMessage]);

//     try {
//       // Envia a mensagem COMPLETA para o backend e para o cliente
//       await sendMessage(conv.contact.phone_number, messageToSend);
//     } catch (error) {
//       console.error('Error sending message:', error);
//       toast({ title: "Erro", description: "Falha ao enviar mensagem", variant: "destructive" });
//       // Remove a mensagem otimista em caso de erro
//       setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
//     }
//   };

//   const handleSendCatalog = async () => {
//     if (!selectedCustomer || !selectedConversationId) return;
//     const whatsappConv = whatsappConversations.find(conv => conv.contact?.id === selectedCustomerId);
//     if (!whatsappConv?.contact?.phone_number) return;
//     try {
//       await sendCatalog(whatsappConv.contact.phone_number);
//     } catch (error) {
//       console.error('Error sending catalog:', error);
//       toast({ title: "Erro", description: "Falha ao enviar o catálogo.", variant: "destructive" });
//     }
//   };
  
//   const handleCloseChat = useCallback(async () => {
//     if (!selectedConversationId) return;
//     if (!confirm("Tem a certeza de que quer fechar este atendimento?")) return;
//     const { error } = await supabase.rpc('close_conversation', { conv_id: selectedConversationId });
//     if (error) {
//         toast({ title: "Erro", description: "Não foi possível fechar a conversa.", variant: "destructive" }); return;
//     }
//     setWhatsappConversations(currentConvs => currentConvs.filter(c => c.id !== selectedConversationId));
//     setSelectedConversationId(null);
//     setSelectedCustomerId(null);
//     toast({ title: "Sucesso", description: "A conversa foi fechada." });
//   }, [selectedConversationId, toast]);
  
//   const handleLogout = async () => { await supabase.auth.signOut(); };

//   if (loadingProfile || isLoadingConversations) {
//     return (
//         <div className="min-h-screen bg-chat-bg flex items-center justify-center">
//             <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
//             <p className="ml-4 text-lg text-muted-foreground">A carregar...</p>
//         </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-chat-bg flex">
//       <div className="fixed left-0 top-0 h-screen z-10">
//         <div className="flex flex-col h-full">
//           <WhatsAppStatus />
//           <CustomerList
//             queue={customers.filter(c => queue.some(conv => conv.id === c.conversationId))}
//             myChats={customers.filter(c => myChats.some(conv => conv.id === c.conversationId))}
//             selectedCustomerId={selectedCustomerId}
//             onSelectCustomer={handleSelectCustomer}
//           />
//           <div className="p-4 border-t">
//             <Button variant="ghost" onClick={handleLogout} className="w-full justify-start">
//                 <LogOut className="h-4 w-4 mr-2" />
//                 Sair
//             </Button>
//           </div>
//         </div>
//       </div>
//       <div className="flex-1 flex flex-col ml-80">
//         {selectedCustomer ? (
//           <>
//             <div className="fixed top-0 right-0 left-80 z-10 bg-background border-b">
//               <ChatHeader
//                 customerName={selectedCustomer.name}
//                 customerAvatar={selectedCustomer.avatar}
//                 isOnline={selectedCustomer.isOnline}
//                 onUnassignChat={handleUnassignChat}
//                 onCloseChat={handleCloseChat}
//               >
//                 <NotificationBell onViewOrder={handleViewOrder} />
//               </ChatHeader>
//               <div className="p-2 border-b bg-background flex justify-end">
//                 <Button variant="outline" size="sm" onClick={() => setCurrentView('admin')} className="flex items-center gap-2">
//                   <BarChart3 className="h-4 w-4" />
//                   Painel Admin
//                 </Button>
//               </div>
//             </div>
//             <div className="flex-1 overflow-y-auto p-4 space-y-2 mt-32">
//               {messages.map((message) => 
//                 <MessageBubble 
//                     key={message.id} 
//                     message={message} 
//                     onViewOrder={handleViewOrder}
//                     agentName={profile?.full_name || undefined}
//                 />
//               )}
//               <div ref={messagesEndRef} />
//             </div>
//             <ChatInput
//               onSendMessage={handleSendMessage}
//               onSendCatalog={handleSendCatalog}
//               onSendPayment={() => {}}
//               isLoading={loading}
//             />
//           </>
//         ) : (
//           <div className="flex-1 flex items-center justify-center">
//             <div className="text-center">
//               <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
//               <p className="text-lg font-medium">Nenhuma conversa selecionada</p>
//               <p className="text-muted-foreground">Escolha um atendimento ou atenda um cliente na fila.</p>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default Index;



// src/pages/Index.tsx

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ChatHeader } from "@/components/ChatHeader";
import { MessageBubble, Message } from "@/components/MessageBubble";
import { ChatInput } from "@/components/ChatInput";
import { CustomerList, Customer } from "@/components/CustomerList";
import { AdminPanel } from "@/components/AdminPanel";
import { WhatsAppStatus } from "@/components/WhatsAppStatus";
import { Button } from "@/components/ui/button";
import { MessageSquare, BarChart3, LogOut, Loader2 } from "lucide-react";
import { useWhatsApp, WhatsAppConversation, WhatsAppMessage } from "@/hooks/useWhatsApp";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { NotificationBell } from "@/components/NotificationBell";
import { useSession } from "@/hooks/useSession";
import { useProfile } from "@/hooks/useProfile";

const Index = () => {
  const { session } = useSession();
  const { profile, loading: loadingProfile } = useProfile();
  const [currentView, setCurrentView] = useState<'chat' | 'admin'>('chat');
  const [viewingOrderId, setViewingOrderId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [whatsappConversations, setWhatsappConversations] = useState<(WhatsAppConversation & { contact: any, last_message: any })[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  
  const { sendMessage, sendCatalog, getConversations, getMessages, loading } = useWhatsApp();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Efeito para carregar as conversas, dependente da sessão do utilizador
  useEffect(() => {
    const loadConversations = async () => {
      if (!session) return;
      setIsLoadingConversations(true);
      try {
        const conversations = await getConversations();
        setWhatsappConversations(conversations as any);
      } catch (error) { 
        console.error('Error loading conversations:', error); 
        toast({ title: "Erro", description: "Não foi possível carregar as conversas.", variant: "destructive" });
      } finally {
        setIsLoadingConversations(false);
      }
    };
    loadConversations();
  }, [session, getConversations, toast]);

  // Efeito para carregar as mensagens de uma conversa selecionada
  useEffect(() => {
    if (selectedConversationId) {
      const loadMessages = async () => {
        try {
          const msgs = await getMessages(selectedConversationId);
          const convertedMessages: Message[] = msgs.map(msg => ({
            id: msg.id, text: msg.content, timestamp: msg.timestamp || msg.created_at, isSent: !msg.is_from_contact, type: msg.message_type as any, metadata: msg.metadata as any
          }));
          setMessages(convertedMessages);
        } catch (error) { console.error('Error loading messages:', error); }
      };
      loadMessages();
    } else {
      setMessages([]);
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
            id: newMessage.id, text: newMessage.content, timestamp: newMessage.timestamp || newMessage.created_at, isSent: !newMessage.is_from_contact, type: newMessage.message_type as any, metadata: newMessage.metadata as any
          };
          setMessages(prev => [...prev, convertedMessage]);
          supabase.rpc('reset_unread_count', { conv_id: newMessage.conversation_id }).then();
        }
      })
      .subscribe();

    const conversationsChannel = supabase
      .channel('whatsapp_conversations_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_conversations' },
      async (payload) => {
          if (payload.eventType === 'INSERT') {
            const { data: newConv } = await supabase.from('conversations_with_last_message').select('*').eq('conversation_id', payload.new.id).single();
            if (newConv) {
                setWhatsappConversations(currentConvs => [newConv as any, ...currentConvs]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedConv = payload.new as WhatsAppConversation;
            setWhatsappConversations(currentConvs => 
                currentConvs.map(conv => 
                    conv.id === updatedConv.id ? { ...conv, ...updatedConv } : conv
                ).sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
            );
          }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(conversationsChannel);
    };
  }, [selectedConversationId, getConversations]);

  // Filtra as conversas em "Fila" e "Meus Atendimentos"
  const { queue, myChats } = useMemo(() => {
    const queue = whatsappConversations.filter(c => c.assigned_to === null);
    const myChats = whatsappConversations.filter(c => c.assigned_to === session?.user?.id);
    return { queue, myChats };
  }, [whatsappConversations, session]);

  const customers: Customer[] = whatsappConversations.map(conv => ({
    id: conv.contact?.id || conv.id, name: conv.contact?.name || conv.contact?.phone_number || 'Cliente', avatar: conv.contact?.profile_pic_url || '', lastMessage: conv.last_message?.content || 'Última mensagem...', timestamp: conv.last_message_at || conv.created_at, unreadCount: conv.unread_count || 0, conversationId: conv.id, isOnline: false, status: 'active' as const,
  }));
  
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
  useEffect(() => { scrollToBottom(); }, [messages]);

  const handleViewOrder = (orderId: string) => { setViewingOrderId(orderId); setCurrentView('admin'); };
  const handleBackToChat = () => { setCurrentView('chat'); setViewingOrderId(null); };
  
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

  const handleUnassignChat = useCallback(async () => {
    if (!selectedConversationId) return;
    const { error } = await supabase.rpc('unassign_conversation', { conv_id: selectedConversationId });
    if (error) {
        toast({ title: "Erro", description: "Não foi possível devolver a conversa à fila.", variant: "destructive" }); return;
    }
    setWhatsappConversations(currentConvs => 
        currentConvs.map(c => 
            c.id === selectedConversationId ? { ...c, assigned_to: null } : c
        )
    );
    setSelectedConversationId(null);
    setSelectedCustomerId(null);
    toast({ title: "Sucesso", description: "A conversa foi devolvida à fila." });
  }, [selectedConversationId, toast]);

  const handleAssignChat = useCallback(async (conversationId: string) => {
    if (!session?.user?.id || !profile?.full_name) {
        toast({ title: "Erro", description: "Perfil do utilizador não encontrado.", variant: "destructive" }); return;
    }
    const convToAssign = whatsappConversations.find(c => c.id === conversationId);
    if (!convToAssign?.contact?.phone_number) return;

    const { error } = await supabase.rpc('assign_conversation', { conv_id: conversationId, agent_id: session.user.id });
    if (error) {
        toast({ title: "Erro", description: "Não foi possível atender à conversa.", variant: "destructive" }); return;
    }

    const greetingMessage = `Olá! O meu nome é ${profile.full_name} e serei eu a tratar do seu atendimento. 👋`;
    try {
        await sendMessage(convToAssign.contact.phone_number, greetingMessage);
    } catch (e) {
        toast({ title: "Aviso", description: "A conversa foi atribuída, mas não foi possível enviar a mensagem de saudação.", variant: "destructive" });
    }

    setWhatsappConversations(currentConvs => {
        const conv = currentConvs.find(c => c.id === conversationId);
        if (!conv) return currentConvs;
        setSelectedCustomerId(conv.contact.id);
        setSelectedConversationId(conv.id);
        return currentConvs.map(c => 
            c.id === conversationId ? { ...c, assigned_to: session.user.id, unread_count: 0 } : c
        );
    });
  }, [session, profile, toast, sendMessage, whatsappConversations]);

  const handleSendMessage = async (text: string) => {
    if (!selectedCustomer || !selectedConversationId || !session?.user?.id || !profile?.full_name) return;
    const conv = whatsappConversations.find(c => c.id === selectedConversationId);
    if (!conv || !conv.contact?.phone_number) return;

    if (conv.assigned_to === null) {
      await handleAssignChat(selectedConversationId);
    }
    
    // const messageToSend = `´Atendente: ${profile.full_name}´\n${text}`;
    const messageToSend = `\`Atendente: ${profile.full_name}\`\n${text}`;

    
    try {
      await sendMessage(conv.contact.phone_number, messageToSend);
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
    } catch (error) {
      console.error('Error sending catalog:', error);
      toast({ title: "Erro", description: "Falha ao enviar o catálogo.", variant: "destructive" });
    }
  };
  
  const handleCloseChat = useCallback(async () => {
    if (!selectedConversationId) return;
    if (!confirm("Tem a certeza de que quer fechar este atendimento?")) return;
    const { error } = await supabase.rpc('close_conversation', { conv_id: selectedConversationId });
    if (error) {
        toast({ title: "Erro", description: "Não foi possível fechar a conversa.", variant: "destructive" }); return;
    }
    setWhatsappConversations(currentConvs => currentConvs.filter(c => c.id !== selectedConversationId));
    setSelectedConversationId(null);
    setSelectedCustomerId(null);
    toast({ title: "Sucesso", description: "A conversa foi fechada." });
  }, [selectedConversationId, toast]);
  
  const handleLogout = async () => { await supabase.auth.signOut(); };

  if (loadingProfile || isLoadingConversations) {
    return (
        <div className="min-h-screen bg-chat-bg flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
            <p className="ml-4 text-lg text-muted-foreground">A carregar...</p>
        </div>
    );
  }

  if (currentView === 'admin') {
    return (<AdminPanel orderId={viewingOrderId} onBackToChat={handleBackToChat} />);
  }

  return (
    <div className="min-h-screen bg-chat-bg flex">
      <div className="fixed left-0 top-0 h-screen z-10">
        <div className="flex flex-col h-full">
          <WhatsAppStatus />
          <CustomerList
            queue={customers.filter(c => queue.some(conv => conv.id === c.conversationId))}
            myChats={customers.filter(c => myChats.some(conv => conv.id === c.conversationId))}
            selectedCustomerId={selectedCustomerId}
            onSelectCustomer={handleSelectCustomer}
            onAssignChat={handleAssignChat}
          />
          <div className="p-4 border-t">
            <Button variant="ghost" onClick={handleLogout} className="w-full justify-start">
                <LogOut className="h-4 w-4 mr-2" />
                Sair
            </Button>
          </div>
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
                onUnassignChat={handleUnassignChat}
                onCloseChat={handleCloseChat}
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
                    agentName={profile?.full_name || undefined}
                />
              )}
              <div ref={messagesEndRef} />
            </div>
            <ChatInput
              onSendMessage={handleSendMessage}
              onSendCatalog={handleSendCatalog}
              onSendPayment={() => {}}
              isLoading={loading}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">Nenhuma conversa selecionada</p>
              <p className="text-muted-foreground">Escolha um atendimento ou atenda a um cliente na fila.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;